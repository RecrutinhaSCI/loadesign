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
//   obrigatório) e são reportados.
// Validado apenas com dados sintéticos locais. Em produção, exigirá etapa
// própria e autorizada.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const { normalizePhone, isValidPhone, normalizeEmail } = require("../utils/phone");
const { logActivity } = require("./activity.service");

const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const realEmail = (e) => {
  const n = normalizeEmail(e);
  return n && !n.endsWith("@whatsapp.local") ? n : null;
};

async function plan(db = prisma) {
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
    const phone = normalizePhone(r.phone);
    if (!isValidPhone(phone)) { withoutPhone.push({ kind, id: r.id, name: r.name }); return; }
    if (!groups.has(phone)) groups.set(phone, []);
    groups.get(phone).push({ kind, ...r, email: realEmail(r.email) });
  };
  clients.forEach((c) => add("client", c));
  leads.forEach((l) => add("lead", l));

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

    const entry = { phoneNormalized, records: records.map(({ kind, id, name, email: e }) => ({ kind, id, name, email: e })) };
    if (reasons.length) conflicts.push({ ...entry, reasons });
    else ready.push({ ...entry, email: email || null, source: records });
  }

  return {
    summary: { leads: leads.length, clients: clients.length, alreadyImported, ready: ready.length, conflicts: conflicts.length, withoutPhone: withoutPhone.length },
    ready: ready.map(({ source, ...r }) => r),
    conflicts,
    withoutPhone,
    _ready: ready,
  };
}

async function apply(user) {
  return prisma.$transaction(async (tx) => {
    const p = await plan(tx);
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
        message: `Importado do cadastro legado (${[client && "cliente", lead && "lead"].filter(Boolean).join(" + ")})`,
        data: { legacyClientId: client?.id ?? null, legacyLeadId: lead?.id ?? null },
      });
      created++;
    }
    const { _ready, ...report } = p;
    return { ...report, created };
  }, { timeout: 60_000 });
}

async function preview() {
  const { _ready, ...report } = await plan();
  return report;
}

module.exports = { preview, apply };
