// src/services/legacyImport.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Reconciliação dos cadastros legados (leads + clients) com Contatos.
//
// - NÃO altera nem apaga leads/clients: apenas cria contatos vinculados por
//   legacyLeadId / legacyClientId (únicos → importação idempotente).
// - Agrupa por telefone normalizado. Um grupo só é importado automaticamente
//   se não houver conflito; conflitos ficam listados para decisão manual:
//     * nomes diferentes para o mesmo telefone;
//     * e-mails diferentes (ambos preenchidos);
//     * já existe contato do fluxo novo com o mesmo telefone/e-mail.
// - E-mails técnicos "@whatsapp.local" (gerados pelo formulário público) não
//   são copiados: o contato fica sem e-mail (não inventamos e-mails).
// - Registros sem telefone válido não podem virar contato (telefone é
//   obrigatório) e são reportados. A prévia aceita um telefone informado para
//   cada um deles: o número entra só no contato novo (o legado não muda) e
//   passa pelas mesmas verificações de conflito. Quem ficar sem telefone pode
//   ser importado depois — a importação é idempotente.
// Validado apenas com dados sintéticos locais. Em produção, exigirá etapa
// própria e autorizada.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const { normalizePhone, isValidPhone, normalizeEmail } = require("../utils/phone");
const { logActivity } = require("./activity.service");
const ApiError = require("../utils/ApiError");

const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const realEmail = (e) => {
  const n = normalizeEmail(e);
  return n && !n.endsWith("@whatsapp.local") ? n : null;
};

/**
 * Telefones informados na prévia para registros legados sem telefone válido.
 * Formato: { "lead:<id>": "(54) 99999-0000", "client:<id>": "..." }.
 * O telefone corrigido é usado SÓ no contato novo — o cadastro legado não é
 * alterado. Valida chaves (precisam ser registros sem telefone válido) e
 * números; qualquer problema → 400, sem gravar nada.
 */
function parsePhoneOverrides(raw) {
  if (raw == null) return new Map();
  if (typeof raw !== "object" || Array.isArray(raw)) throw ApiError.badRequest("Telefones corrigidos: formato inválido.");
  const entries = Object.entries(raw);
  if (entries.length > 500) throw ApiError.badRequest("Telefones corrigidos: itens demais.");
  const out = new Map();
  for (const [key, value] of entries) {
    if (!/^(lead|client):[A-Za-z0-9_-]{1,64}$/.test(key)) throw ApiError.badRequest("Telefones corrigidos: identificador inválido.");
    if (value == null || String(value).trim() === "") continue; // vazio = deixar para depois
    if (typeof value !== "string" || value.length > 30) throw ApiError.badRequest("Telefones corrigidos: valor inválido.");
    const n = normalizePhone(value);
    if (!isValidPhone(n)) throw ApiError.badRequest(`Telefone inválido: ${value.trim()}.`, { key });
    out.set(key, { raw: value.trim(), normalized: n });
  }
  return out;
}

async function plan(db = prisma, overrides = new Map()) {
  const [leads, clients, linked] = await Promise.all([
    db.lead.findMany({ select: { id: true, name: true, email: true, phone: true, notes: true, source: true, createdAt: true } }),
    db.client.findMany({ select: { id: true, name: true, email: true, phone: true, notes: true, createdAt: true } }),
    db.contact.findMany({ select: { id: true, phoneNormalized: true, emailNormalized: true, legacyLeadId: true, legacyClientId: true } }),
  ]);
  const linkedLead = new Set(linked.map((c) => c.legacyLeadId).filter(Boolean));
  const linkedClient = new Set(linked.map((c) => c.legacyClientId).filter(Boolean));

  const groups = new Map();
  const withoutPhone = [];
  let alreadyImported = 0;
  const add = (kind, r) => {
    if ((kind === "lead" && linkedLead.has(r.id)) || (kind === "client" && linkedClient.has(r.id))) { alreadyImported++; return; }
    let phone = normalizePhone(r.phone);
    let rawPhone = r.phone;
    let phoneOverridden = false;
    if (!isValidPhone(phone)) {
      const o = overrides.get(`${kind}:${r.id}`);
      if (!o) { withoutPhone.push({ kind, id: r.id, name: r.name, email: realEmail(r.email) }); return; }
      phone = o.normalized; rawPhone = o.raw; phoneOverridden = true;
      usedOverrides.add(`${kind}:${r.id}`);
    }
    if (!groups.has(phone)) groups.set(phone, []);
    groups.get(phone).push({ kind, ...r, phone: rawPhone, phoneOverridden, email: realEmail(r.email) });
  };
  const usedOverrides = new Set();
  clients.forEach((c) => add("client", c));
  leads.forEach((l) => add("lead", l));
  // Só é possível corrigir o telefone de quem está sem telefone válido.
  const unknown = [...overrides.keys()].filter((k) => !usedOverrides.has(k));
  if (unknown.length) throw ApiError.badRequest("Telefone corrigido para registro que não está na lista de \"sem telefone\" (ou já importado).", { keys: unknown });

  const ready = [];
  const conflicts = [];
  for (const [phoneNormalized, records] of groups) {
    const reasons = [];
    const names = new Set(records.map((r) => normName(r.name)));
    if (names.size > 1) reasons.push("nomes diferentes para o mesmo telefone");
    const emails = new Set(records.map((r) => r.email).filter(Boolean));
    if (emails.size > 1) reasons.push("e-mails diferentes");
    if (records.filter((r) => r.kind === "client").length > 1) reasons.push("mais de um cliente legado");
    if (records.filter((r) => r.kind === "lead").length > 1) reasons.push("mais de um lead legado");
    const [email] = [...emails];
    const existing = linked.find((c) => c.phoneNormalized === phoneNormalized || (email && c.emailNormalized === email));
    if (existing) reasons.push("já existe contato com este telefone/e-mail");

    const entry = {
      phoneNormalized,
      phoneOverridden: records.some((r) => r.phoneOverridden),
      records: records.map(({ kind, id, name, email: e, phoneOverridden }) => ({ kind, id, name, email: e, phoneOverridden })),
    };
    if (reasons.length) conflicts.push({ ...entry, reasons });
    else ready.push({ ...entry, email: email || null, source: records });
  }

  return {
    summary: {
      leads: leads.length, clients: clients.length, alreadyImported, ready: ready.length, conflicts: conflicts.length,
      withoutPhone: withoutPhone.length, phonesCorrected: usedOverrides.size,
    },
    ready: ready.map(({ source, ...r }) => r),
    conflicts,
    withoutPhone,
    _ready: ready,
  };
}

async function apply(user, rawOverrides) {
  const overrides = parsePhoneOverrides(rawOverrides);
  return prisma.$transaction(async (tx) => {
    const p = await plan(tx, overrides);
    let created = 0;
    for (const g of p._ready) {
      const client = g.source.find((r) => r.kind === "client");
      const lead = g.source.find((r) => r.kind === "lead");
      const main = client || lead;
      const contact = await tx.contact.create({
        data: {
          name: main.name.trim(), phone: main.phone.trim(), phoneNormalized: g.phoneNormalized,
          email: g.email, emailNormalized: g.email,
          type: client ? "CLIENT" : "PROSPECT",
          source: lead ? `legado:${lead.source || "lead"}` : "legado:cliente",
          notes: [client?.notes, lead?.notes].filter(Boolean).join("\n\n") || null,
          legacyClientId: client?.id ?? null, legacyLeadId: lead?.id ?? null,
        },
      });
      await logActivity(tx, {
        entityType: "contact", entityId: contact.id, action: "imported", userId: user?.id,
        message: `Importado do cadastro legado (${[client && "cliente", lead && "lead"].filter(Boolean).join(" + ")})${g.phoneOverridden ? " — telefone informado na importação" : ""}`,
        data: { legacyClientId: client?.id ?? null, legacyLeadId: lead?.id ?? null, phoneCorrected: !!g.phoneOverridden },
      });
      created++;
    }
    const { _ready, ...report } = p;
    return { ...report, created };
  }, { timeout: 60_000 });
}

/** Prévia somente leitura; aceita telefones corrigidos para simular o resultado. */
async function preview(rawOverrides) {
  const { _ready, ...report } = await plan(prisma, parsePhoneOverrides(rawOverrides));
  return report;
}

module.exports = { preview, apply };
