// src/services/calendar.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Agenda: eventos manuais (reuniões, entregas, prazos, outros) + itens
// derivados, somente leitura, de dados reais já existentes:
//   - vencimentos de contas a receber pendentes;
//   - prazos de entrega de projetos ativos que TÊM data definida.
// Nada é criado automaticamente: sem data definida, nada aparece.
// Instantes são gravados em UTC; o cliente envia ISO com fuso (-03:00).
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { t, validate } = require("../utils/validation");
const { formatDateOnly } = require("../utils/dates");
const { logActivity } = require("./activity.service");

const TYPES = ["MEETING", "DELIVERY", "DEADLINE", "OTHER"];
const STATUSES = ["SCHEDULED", "DONE", "CANCELLED"];
const MAX_RANGE_DAYS = 100;

const EVENT_INCLUDE = {
  contact: { select: { id: true, name: true, phone: true } },
  project: { select: { id: true, name: true } },
};

const LABELS = {
  title: "Título", type: "Tipo", status: "Situação", startsAt: "Início", endsAt: "Término",
  allDay: "Dia inteiro", location: "Local", notes: "Observações", contactId: "Contato", projectId: "Projeto",
};

const eventSchema = {
  title: t.string({ required: true, max: 160 }),
  type: t.enum(TYPES, { default: "OTHER" }),
  startsAt: t.datetime({ required: true }),
  endsAt: t.datetime({ nullable: true }),
  allDay: t.bool({ default: false }),
  location: t.string({ nullable: true, max: 200 }),
  notes: t.string({ nullable: true, max: 2000 }),
  contactId: t.id({ nullable: true }),
  projectId: t.id({ nullable: true }),
};

function parseRange(query) {
  const from = new Date(String(query.from || ""));
  const to = new Date(String(query.to || ""));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw ApiError.badRequest("Período: informe from e to (ISO 8601).");
  }
  if (to <= from) throw ApiError.badRequest("Período: término deve ser posterior ao início.");
  if ((to - from) / 86_400_000 > MAX_RANGE_DAYS) throw ApiError.badRequest(`Período: máximo de ${MAX_RANGE_DAYS} dias.`);
  return { from, to };
}

/** Datas-calendário (DATE) dentro do período, comparando pelo dia civil. */
function dateOnlyRange({ from, to }) {
  // Margem de 1 dia para cobrir o fuso do cliente; o cliente filtra pelo dia local.
  const d0 = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - 1));
  const d1 = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1));
  return { gte: d0, lte: d1 };
}

async function list(query = {}) {
  const range = parseRange(query);
  const where = {
    startsAt: { lt: range.to },
    OR: [{ endsAt: { gte: range.from } }, { endsAt: null, startsAt: { gte: range.from } }],
  };
  const type = String(query.type || "").toUpperCase();
  if (TYPES.includes(type)) where.type = type;
  const status = String(query.status || "").toUpperCase();
  if (STATUSES.includes(status)) where.status = status;
  else if (query.status !== "all") where.status = { not: "CANCELLED" };
  if (query.contactId) where.contactId = String(query.contactId);
  if (query.projectId) where.projectId = String(query.projectId);

  const includeDerived = query.derived !== "false" && !TYPES.includes(type) && status !== "CANCELLED";
  const dRange = dateOnlyRange(range);
  const [events, dues, deadlines] = await Promise.all([
    prisma.calendarEvent.findMany({ where, include: EVENT_INCLUDE, orderBy: { startsAt: "asc" } }),
    includeDerived
      ? prisma.receivable.findMany({
          where: { status: "PENDING", dueDate: dRange, ...(query.contactId ? { contactId: String(query.contactId) } : {}), ...(query.projectId ? { projectId: String(query.projectId) } : {}) },
          select: { id: true, description: true, amount: true, dueDate: true, contact: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
          orderBy: { dueDate: "asc" },
        })
      : [],
    includeDerived
      ? prisma.workProject.findMany({
          where: { dueDate: dRange, status: { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] }, ...(query.contactId ? { contactId: String(query.contactId) } : {}), ...(query.projectId ? { id: String(query.projectId) } : {}) },
          select: { id: true, name: true, dueDate: true, contact: { select: { id: true, name: true } } },
        })
      : [],
  ]);

  const derived = [
    ...dues.map((r) => ({
      id: `receivable:${r.id}`, source: "receivable", sourceId: r.id, kind: "PAYMENT_DUE",
      title: `Vencimento: ${r.description}`, date: formatDateOnly(r.dueDate), amount: r.amount,
      contact: r.contact, project: r.project,
    })),
    ...deadlines.map((p) => ({
      id: `project:${p.id}`, source: "project", sourceId: p.id, kind: "PROJECT_DUE",
      title: `Entrega prevista: ${p.name}`, date: formatDateOnly(p.dueDate), contact: p.contact, project: { id: p.id, name: p.name },
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return { from: range.from.toISOString(), to: range.to.toISOString(), events, derived };
}

async function assertLinks(db, { contactId, projectId }) {
  if (contactId) {
    const c = await db.contact.findUnique({ where: { id: contactId }, select: { id: true } });
    if (!c) throw ApiError.badRequest("Contato: não encontrado.");
  }
  if (projectId) {
    const p = await db.workProject.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!p) throw ApiError.badRequest("Projeto: não encontrado.");
  }
}

function assertTimes(startsAt, endsAt) {
  if (endsAt && endsAt < startsAt) throw ApiError.badRequest("Término: deve ser igual ou posterior ao início.");
}

async function create(body, user) {
  const data = validate(body, eventSchema, { labels: LABELS });
  assertTimes(data.startsAt, data.endsAt);
  return prisma.$transaction(async (tx) => {
    await assertLinks(tx, data);
    const ev = await tx.calendarEvent.create({ data, include: EVENT_INCLUDE });
    await logActivity(tx, { entityType: "event", entityId: ev.id, action: "created", userId: user?.id, message: `Compromisso agendado: ${ev.title}` });
    return ev;
  });
}

async function update(id, body, user) {
  const data = validate(body, { ...eventSchema, status: t.enum(STATUSES) }, { partial: true, labels: LABELS });
  return prisma.$transaction(async (tx) => {
    const current = await tx.calendarEvent.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Compromisso não encontrado.");
    assertTimes(data.startsAt ?? current.startsAt, data.endsAt !== undefined ? data.endsAt : current.endsAt);
    await assertLinks(tx, data);
    const ev = await tx.calendarEvent.update({ where: { id }, data, include: EVENT_INCLUDE });
    const action = data.status === "CANCELLED" ? "cancelled" : data.status === "DONE" ? "done" : "updated";
    const message = { cancelled: `Compromisso cancelado: ${ev.title}`, done: `Compromisso concluído: ${ev.title}`, updated: `Compromisso atualizado: ${ev.title}` }[action];
    await logActivity(tx, { entityType: "event", entityId: id, action, userId: user?.id, message });
    return ev;
  });
}

module.exports = { list, create, update, TYPES, STATUSES };
