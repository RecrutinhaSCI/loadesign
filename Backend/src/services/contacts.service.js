// src/services/contacts.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Cadastro unificado de CLIENTES e PROSPECTS.
// - Telefone obrigatório e normalizado; e-mail opcional (nunca inventado).
// - Duplicidade = mesmo telefone normalizado OU mesmo e-mail. Nada é mesclado
//   automaticamente: a API devolve 409 com os candidatos e só cria se o
//   chamador confirmar explicitamente (`allowDuplicate: true`).
// - Prospect → Cliente apenas por conversão explícita (ou aprovação de
//   orçamento), registrando a data.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { normalizePhone, isValidPhone, normalizeEmail } = require("../utils/phone");
const { t, validate, parsePagination, pageResult } = require("../utils/validation");
const { logActivity, historyOf, diff } = require("./activity.service");

const LABELS = { name: "Nome", phone: "Telefone", email: "E-mail", type: "Classificação", source: "Origem", notes: "Observações" };

const contactSchema = {
  name: t.string({ required: true, max: 120 }),
  phone: t.string({ required: true, max: 40 }),
  email: t.email({ nullable: true }),
  type: t.enum(["CLIENT", "PROSPECT"], { default: "PROSPECT" }),
  source: t.string({ nullable: true, max: 60 }),
  notes: t.string({ nullable: true, max: 2000 }),
};

const DUP_SELECT = { id: true, name: true, phone: true, email: true, type: true, archivedAt: true };

function parseContactInput(body, { partial = false } = {}) {
  const data = validate(body, contactSchema, { partial, labels: LABELS });
  if (data.phone !== undefined) {
    const normalized = normalizePhone(data.phone);
    if (!isValidPhone(normalized)) throw ApiError.badRequest("Telefone: informe DDD e número (8 a 13 dígitos).", [{ field: "phone", message: "Telefone inválido" }]);
    data.phoneNormalized = normalized;
  }
  if (data.email !== undefined) data.emailNormalized = normalizeEmail(data.email);
  return data;
}

async function findDuplicates(db, { phoneNormalized, emailNormalized, excludeId }) {
  const or = [];
  if (phoneNormalized) or.push({ phoneNormalized });
  if (emailNormalized) or.push({ emailNormalized });
  if (!or.length) return [];
  const rows = await db.contact.findMany({
    where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { ...DUP_SELECT, phoneNormalized: true, emailNormalized: true },
    take: 10,
  });
  return rows.map(({ phoneNormalized: p, emailNormalized: e, ...c }) => ({
    ...c,
    matchedBy: [p === phoneNormalized && "phone", emailNormalized && e === emailNormalized && "email"].filter(Boolean),
  }));
}

function duplicateError(duplicates) {
  return ApiError.conflict("Possível contato duplicado: já existe cadastro com este telefone ou e-mail.", {
    code: "DUPLICATE_CONTACT",
    duplicates,
  });
}

/** Cria contato (usado também dentro da transação de orçamento). */
async function createContact(db, input, { allowDuplicate = false, userId = null } = {}) {
  const data = parseContactInput(input);
  const duplicates = await findDuplicates(db, data);
  if (duplicates.length && !allowDuplicate) throw duplicateError(duplicates);

  const contact = await db.contact.create({ data });
  await logActivity(db, {
    entityType: "contact", entityId: contact.id, action: "created", userId,
    message: `Contato cadastrado como ${contact.type === "CLIENT" ? "cliente" : "prospect"}: ${contact.name}`,
    data: duplicates.length ? { duplicateConfirmed: duplicates.map((d) => d.id) } : null,
  });
  return contact;
}

async function list(query = {}) {
  const pg = parsePagination(query);
  const where = {};
  if (query.archived === "true") where.archivedAt = { not: null };
  else if (query.archived !== "all") where.archivedAt = null;
  if (query.type && ["CLIENT", "PROSPECT"].includes(String(query.type).toUpperCase())) {
    where.type = String(query.type).toUpperCase();
  }
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    const digits = search.replace(/\D/g, "");
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phoneNormalized: { contains: normalizePhone(digits) || digits } }] : []),
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.contact.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: pg.skip, take: pg.take,
      include: { _count: { select: { proposals: true, projects: true } } },
    }),
    prisma.contact.count({ where }),
  ]);
  return pageResult(items, total, pg);
}

async function get(id) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      proposals: { orderBy: { createdAt: "desc" }, include: { project: { select: { id: true, name: true, status: true } } } },
      projects: { orderBy: { createdAt: "desc" } },
      receivables: { orderBy: { dueDate: "asc" }, where: { status: { not: "CANCELLED" } } },
    },
  });
  if (!contact) throw ApiError.notFound("Contato não encontrado.");
  const [history, duplicates] = await Promise.all([
    historyOf("contact", id),
    findDuplicates(prisma, { ...contact, excludeId: id }),
  ]);
  return { ...contact, history, possibleDuplicates: duplicates };
}

async function create(body, user) {
  const allowDuplicate = body?.allowDuplicate === true;
  return prisma.$transaction((tx) => createContact(tx, body, { allowDuplicate, userId: user?.id }));
}

async function update(id, body, user) {
  const data = parseContactInput(body, { partial: true });
  const allowDuplicate = body?.allowDuplicate === true;
  return prisma.$transaction(async (tx) => {
    const current = await tx.contact.findUnique({ where: { id }, include: { _count: { select: { projects: true } } } });
    if (!current) throw ApiError.notFound("Contato não encontrado.");

    if (data.type && data.type !== current.type) {
      if (data.type === "PROSPECT" && current._count.projects > 0) {
        throw ApiError.conflict("Contato com projetos não pode voltar a ser prospect.");
      }
      if (data.type === "CLIENT") data.convertedAt = current.convertedAt ?? new Date();
    }
    if (data.phoneNormalized !== undefined || data.emailNormalized !== undefined) {
      const duplicates = await findDuplicates(tx, {
        phoneNormalized: data.phoneNormalized !== undefined && data.phoneNormalized !== current.phoneNormalized ? data.phoneNormalized : null,
        emailNormalized: data.emailNormalized !== undefined && data.emailNormalized !== current.emailNormalized ? data.emailNormalized : null,
        excludeId: id,
      });
      if (duplicates.length && !allowDuplicate) throw duplicateError(duplicates);
    }

    const changes = diff(current, data);
    if (!Object.keys(changes).length) return current;
    const updated = await tx.contact.update({ where: { id }, data });
    await logActivity(tx, { entityType: "contact", entityId: id, action: "updated", userId: user?.id, message: "Cadastro atualizado", data: changes });
    return updated;
  });
}

/** Prospect → Cliente (idempotente: segunda chamada devolve 409 sem alterar nada). */
async function convertToClient(db, id, { userId = null, reason = "Conversão manual" } = {}) {
  const res = await db.contact.updateMany({ where: { id, type: "PROSPECT" }, data: { type: "CLIENT", convertedAt: new Date() } });
  if (res.count === 0) {
    const exists = await db.contact.findUnique({ where: { id }, select: { type: true } });
    if (!exists) throw ApiError.notFound("Contato não encontrado.");
    return { converted: false };
  }
  await logActivity(db, { entityType: "contact", entityId: id, action: "converted", userId, message: `Prospect convertido em cliente (${reason})` });
  return { converted: true };
}

async function convert(id, user) {
  return prisma.$transaction(async (tx) => {
    const { converted } = await convertToClient(tx, id, { userId: user?.id });
    if (!converted) throw ApiError.conflict("Este contato já é cliente.");
    return tx.contact.findUnique({ where: { id } });
  });
}

async function setArchived(id, archived, user) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.contact.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Contato não encontrado.");
    if (Boolean(current.archivedAt) === archived) return current;
    const updated = await tx.contact.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    await logActivity(tx, { entityType: "contact", entityId: id, action: archived ? "archived" : "unarchived", userId: user?.id, message: archived ? "Contato arquivado" : "Contato reativado" });
    return updated;
  });
}

async function checkDuplicates(query) {
  const phoneNormalized = query.phone ? normalizePhone(query.phone) : null;
  const emailNormalized = query.email ? normalizeEmail(query.email) : null;
  return findDuplicates(prisma, {
    phoneNormalized: phoneNormalized && isValidPhone(phoneNormalized) ? phoneNormalized : null,
    emailNormalized,
    excludeId: query.excludeId || undefined,
  });
}

module.exports = { list, get, create, update, convert, setArchived, checkDuplicates, createContact, convertToClient, findDuplicates };
