// src/services/workProjects.service.js
// Projetos oficializados (a partir de orçamentos aprovados).
// Valor contratado e modalidade não são editáveis aqui: mudanças financeiras
// passam pelas contas a receber (cancelamento/estorno com histórico).

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { t, validate, parsePagination, pageResult } = require("../utils/validation");
const { parseDateOnly, todayBR } = require("../utils/dates");
const { logActivity, historyOf, diff } = require("./activity.service");

const STATUSES = ["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];
const STATUS_LABEL = { PLANNED: "Planejado", IN_PROGRESS: "Em andamento", REVIEW: "Em revisão", DONE: "Entregue", CANCELLED: "Cancelado" };

const LIST_INCLUDE = {
  contact: { select: { id: true, name: true, phone: true, type: true } },
  proposal: { select: { id: true, title: true, estimatedValue: true } },
  recurring: { select: { id: true, status: true, amount: true, dueDay: true } },
};

async function financialTotals(projectIds) {
  if (!projectIds.length) return {};
  const rows = await prisma.receivable.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _sum: { amount: true, receivedAmount: true },
    orderBy: { projectId: "asc" },
  });
  const out = {};
  for (const r of rows) {
    const o = (out[r.projectId] ||= { pending: 0, received: 0 });
    if (r.status === "PENDING") o.pending += Number(r._sum.amount ?? 0);
    if (r.status === "RECEIVED") o.received += Number(r._sum.receivedAmount ?? 0);
  }
  for (const o of Object.values(out)) { o.pending = Math.round(o.pending * 100) / 100; o.received = Math.round(o.received * 100) / 100; }
  return out;
}

async function list(query = {}) {
  const pg = parsePagination(query);
  const where = {};
  const status = String(query.status || "").toUpperCase();
  if (status === "ACTIVE") where.status = { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] };
  else if (STATUSES.includes(status)) where.status = status;
  if (query.contactId) where.contactId = String(query.contactId);
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { serviceName: { contains: search, mode: "insensitive" } },
      { contact: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.workProject.findMany({ where, include: LIST_INCLUDE, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
    prisma.workProject.count({ where }),
  ]);
  const totals = await financialTotals(items.map((p) => p.id));
  return pageResult(items.map((p) => ({ ...p, finance: totals[p.id] || { pending: 0, received: 0 } })), total, pg);
}

async function get(id) {
  const project = await prisma.workProject.findUnique({
    where: { id },
    include: {
      ...LIST_INCLUDE,
      proposal: true,
      recurring: true,
      receivables: { orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }] },
      events: { orderBy: { startsAt: "asc" }, where: { status: { not: "CANCELLED" } } },
    },
  });
  if (!project) throw ApiError.notFound("Projeto não encontrado.");
  const history = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "project", entityId: id },
        ...(project.proposalId ? [{ entityType: "proposal", entityId: project.proposalId }] : []),
        ...(project.recurring ? [{ entityType: "recurring", entityId: project.recurring.id }] : []),
        { entityType: "receivable", entityId: { in: project.receivables.map((r) => r.id) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const totals = await financialTotals([id]);
  return { ...project, finance: totals[id] || { pending: 0, received: 0 }, history };
}

async function update(id, body, user) {
  const data = validate(body, {
    name: t.string({ max: 160 }),
    description: t.string({ nullable: true, max: 5000 }),
    status: t.enum(["PLANNED", "IN_PROGRESS", "REVIEW", "DONE"]),
    startDate: t.date({ nullable: true }),
    dueDate: t.date({ nullable: true }),
  }, { partial: true, labels: { name: "Nome", description: "Descrição", status: "Status", startDate: "Início", dueDate: "Prazo de entrega" } });

  return prisma.$transaction(async (tx) => {
    const current = await tx.workProject.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Projeto não encontrado.");
    if (current.status === "CANCELLED") throw ApiError.conflict("Projeto cancelado não pode ser alterado.");
    const start = data.startDate !== undefined ? data.startDate : current.startDate;
    const due = data.dueDate !== undefined ? data.dueDate : current.dueDate;
    if (start && due && due < start) throw ApiError.badRequest("Prazo de entrega: deve ser posterior ao início.");

    if (data.status === "DONE" && current.status !== "DONE") data.deliveredAt = new Date();
    if (data.status && data.status !== "DONE") data.deliveredAt = null;

    const changes = diff(current, data);
    if (!Object.keys(changes).length) return get(id);
    await tx.workProject.update({ where: { id }, data });
    await logActivity(tx, {
      entityType: "project", entityId: id, action: data.status && data.status !== current.status ? "status" : "updated", userId: user?.id,
      message: data.status && data.status !== current.status ? `Status: ${STATUS_LABEL[current.status]} → ${STATUS_LABEL[data.status]}` : "Projeto atualizado",
      data: changes,
    });
    return null;
  }).then((r) => r || get(id));
}

/** Cancela o projeto: cobranças pendentes canceladas, mensalidade encerrada. Recebidos são preservados. */
async function cancel(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ required: true, min: 3, max: 500 }) }, { labels: { reason: "Motivo" } });
  await prisma.$transaction(async (tx) => {
    const res = await tx.workProject.updateMany({ where: { id, status: { not: "CANCELLED" } }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    if (res.count === 0) {
      const p = await tx.workProject.findUnique({ where: { id }, select: { id: true } });
      if (!p) throw ApiError.notFound("Projeto não encontrado.");
      throw ApiError.conflict("Projeto já cancelado.");
    }
    const charges = await tx.receivable.updateMany({
      where: { projectId: id, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: `Projeto cancelado: ${reason}` },
    });
    const rec = await tx.recurringAgreement.updateMany({
      where: { projectId: id, status: { not: "ENDED" } },
      data: { status: "ENDED", endDate: parseDateOnly(todayBR()) },
    });
    await logActivity(tx, {
      entityType: "project", entityId: id, action: "cancelled", userId: user?.id,
      message: `Projeto cancelado: ${reason} (${charges.count} cobrança(s) pendente(s) cancelada(s)${rec.count ? ", mensalidade encerrada" : ""})`,
    });
  });
  return get(id);
}

module.exports = { list, get, update, cancel, STATUSES };
