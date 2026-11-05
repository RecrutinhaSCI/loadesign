// src/services/proposals.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Orçamentos do fluxo comercial.
//
// Estados: PENDING → APPROVED | REJECTED | CANCELLED
//          REJECTED → PENDING (reabertura, com histórico) | CANCELLED
// - Criar: identifica/cria o contato e cria o orçamento numa única transação.
//   Valor estimado NÃO gera cobrança nem receita.
// - Aprovar: atualização condicional PENDING → APPROVED (aprovação dupla é
//   impossível), converte prospect em cliente, oficializa o projeto (único por
//   orçamento) e gera as cobranças conforme a modalidade — tudo atômico.
//   O orçamento original é preservado (valor estimado, descrição, serviço).
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { t, validate, parsePagination, pageResult } = require("../utils/validation");
const { fromCents } = require("../utils/money");
const { logActivity, historyOf, diff } = require("./activity.service");
const contacts = require("./contacts.service");
const finance = require("./finance.service");

const LABELS = {
  contactId: "Contato", title: "Título", description: "Ideia/descrição", serviceId: "Serviço",
  serviceName: "Serviço", estimatedValue: "Valor estimado", finalValue: "Valor final",
  projectName: "Nome do projeto", startDate: "Início", dueDate: "Prazo de entrega", reason: "Motivo",
};

const proposalFields = {
  title: t.string({ nullable: true, max: 160 }),
  description: t.string({ nullable: true, max: 5000 }),
  serviceId: t.id({ nullable: true }),
  estimatedValue: t.money({ nullable: true }),
};

const INCLUDE = {
  contact: { select: { id: true, name: true, phone: true, email: true, type: true, archivedAt: true } },
  project: { select: { id: true, name: true, status: true, contractedValue: true, paymentMode: true } },
};

async function resolveService(db, serviceId) {
  if (!serviceId) return null;
  const s = await db.service.findUnique({ where: { id: serviceId }, select: { id: true, name: true } });
  if (!s) throw ApiError.badRequest("Serviço: pacote não encontrado.", [{ field: "serviceId", message: "Serviço inexistente" }]);
  return s;
}

async function list(query = {}) {
  const pg = parsePagination(query);
  const where = {};
  const status = String(query.status || "").toUpperCase();
  if (["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) where.status = status;
  if (query.contactId) where.contactId = String(query.contactId);
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    const digits = search.replace(/\D/g, "");
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { serviceName: { contains: search, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ contact: { phoneNormalized: { contains: digits } } }] : []),
    ];
  }
  const [items, total, counts] = await prisma.$transaction([
    prisma.proposal.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
    prisma.proposal.count({ where }),
    prisma.proposal.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
  ]);
  const result = pageResult(items, total, pg);
  result.counts = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  return result;
}

async function get(id) {
  const p = await prisma.proposal.findUnique({ where: { id }, include: INCLUDE });
  if (!p) throw ApiError.notFound("Orçamento não encontrado.");
  return { ...p, history: await historyOf("proposal", id) };
}

/**
 * body: { contactId } OU { contact: { name, phone, email?, type? }, allowDuplicateContact? }
 *       + { title?, description?, serviceId?, estimatedValue? }
 */
async function create(body, user) {
  const data = validate(body, { contactId: t.id({ nullable: true }), ...proposalFields }, { labels: LABELS });
  const hasNewContact = body && typeof body.contact === "object" && body.contact !== null;
  if (!data.contactId && !hasNewContact) {
    throw ApiError.badRequest("Contato: selecione um contato existente ou informe nome e telefone.", [{ field: "contact", message: "Contato obrigatório" }]);
  }

  return prisma.$transaction(async (tx) => {
    let contact;
    if (data.contactId) {
      contact = await tx.contact.findUnique({ where: { id: data.contactId } });
      if (!contact) throw ApiError.badRequest("Contato: não encontrado.");
      if (contact.archivedAt) throw ApiError.conflict("Contato arquivado: reative-o antes de criar um orçamento.");
    } else {
      contact = await contacts.createContact(tx, body.contact, { allowDuplicate: body.allowDuplicateContact === true, userId: user?.id });
    }

    const service = await resolveService(tx, data.serviceId);
    const title = data.title || `${service ? service.name : "Orçamento"} — ${contact.name}`;

    // Proteção contra cliques repetidos: mesmo contato + título pendente criado há < 30 s.
    const recent = await tx.proposal.findFirst({
      where: { contactId: contact.id, title, status: "PENDING", createdAt: { gt: new Date(Date.now() - 30_000) } },
      select: { id: true },
    });
    if (recent) throw ApiError.conflict("Orçamento idêntico acabou de ser criado.", { code: "DUPLICATE_SUBMISSION", proposalId: recent.id });

    const proposal = await tx.proposal.create({
      data: {
        contactId: contact.id, contactName: contact.name, contactPhone: contact.phone, title,
        description: data.description ?? null, serviceId: service?.id ?? null, serviceName: service?.name ?? null,
        estimatedValue: data.estimatedValue != null ? fromCents(data.estimatedValue) : null,
      },
      include: INCLUDE,
    });
    await logActivity(tx, {
      entityType: "proposal", entityId: proposal.id, action: "created", userId: user?.id,
      message: `Orçamento criado para ${contact.name} (${contact.type === "CLIENT" ? "cliente" : "prospect"})`,
      data: { contactId: contact.id, estimatedValue: data.estimatedValue ?? null },
    });
    return proposal;
  });
}

async function update(id, body, user) {
  const data = validate(body, proposalFields, { partial: true, labels: LABELS });
  return prisma.$transaction(async (tx) => {
    const current = await tx.proposal.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Orçamento não encontrado.");
    if (current.status !== "PENDING") throw ApiError.conflict("Somente orçamentos pendentes podem ser editados.");

    const patch = {};
    if (data.title !== undefined) patch.title = data.title || current.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.estimatedValue !== undefined) patch.estimatedValue = data.estimatedValue != null ? fromCents(data.estimatedValue) : null;
    if (data.serviceId !== undefined) {
      const service = await resolveService(tx, data.serviceId);
      patch.serviceId = service?.id ?? null;
      patch.serviceName = service?.name ?? null;
    }
    const changes = diff(current, patch);
    if (!Object.keys(changes).length) return tx.proposal.findUnique({ where: { id }, include: INCLUDE });
    const updated = await tx.proposal.update({ where: { id }, data: patch, include: INCLUDE });
    await logActivity(tx, { entityType: "proposal", entityId: id, action: "updated", userId: user?.id, message: "Orçamento editado", data: changes });
    return updated;
  });
}

async function transition(id, { from, to, data = {}, action, message, user }) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.proposal.updateMany({ where: { id, status: { in: from } }, data: { status: to, ...data } });
    if (res.count === 0) {
      const p = await tx.proposal.findUnique({ where: { id }, select: { status: true } });
      if (!p) throw ApiError.notFound("Orçamento não encontrado.");
      throw ApiError.conflict(`Operação não permitida para orçamento ${STATUS_LABEL[p.status]}.`);
    }
    await logActivity(tx, { entityType: "proposal", entityId: id, action, userId: user?.id, message });
    return tx.proposal.findUnique({ where: { id }, include: INCLUDE });
  });
}

const STATUS_LABEL = { PENDING: "pendente", APPROVED: "aprovado", REJECTED: "recusado", CANCELLED: "cancelado" };

function reject(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ nullable: true, max: 1000 }) }, { labels: LABELS });
  return transition(id, {
    from: ["PENDING"], to: "REJECTED", action: "rejected", user,
    data: { rejectedAt: new Date(), rejectionReason: reason ?? null },
    message: reason ? `Orçamento recusado: ${reason}` : "Orçamento recusado",
  });
}

function reopen(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ nullable: true, max: 1000 }) }, { labels: LABELS });
  return transition(id, {
    from: ["REJECTED"], to: "PENDING", action: "reopened", user,
    data: { rejectedAt: null, rejectionReason: null },
    message: reason ? `Orçamento reaberto: ${reason}` : "Orçamento reaberto",
  });
}

function cancel(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ nullable: true, max: 1000 }) }, { labels: LABELS });
  return transition(id, {
    from: ["PENDING", "REJECTED"], to: "CANCELLED", action: "cancelled", user,
    data: { cancelledAt: new Date() },
    message: reason ? `Orçamento cancelado: ${reason}` : "Orçamento cancelado",
  });
}

/**
 * body: {
 *   serviceId? | serviceName?, finalValue, projectName?, description?, startDate?, dueDate?,
 *   payment: { mode: ONE_TIME|INSTALLMENTS|RECURRING, ... }  (ver finance.parsePayment)
 * }
 * Em RECURRING, finalValue é o valor MENSAL.
 */
async function approve(id, body, user) {
  const data = validate(body, {
    serviceId: t.id({ nullable: true }),
    serviceName: t.string({ nullable: true, max: 160 }),
    finalValue: t.money({ required: true }),
    projectName: t.string({ nullable: true, max: 160 }),
    description: t.string({ nullable: true, max: 5000 }),
    startDate: t.date({ nullable: true }),
    dueDate: t.date({ nullable: true }),
  }, { labels: LABELS });
  if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
    throw ApiError.badRequest("Prazo de entrega: deve ser posterior ao início.");
  }
  const payment = finance.parsePayment(body?.payment);

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({ where: { id }, include: { contact: true } });
    if (!proposal) throw ApiError.notFound("Orçamento não encontrado.");
    if (proposal.status !== "PENDING") {
      throw ApiError.conflict(proposal.status === "APPROVED" ? "Este orçamento já foi aprovado." : `Orçamento ${STATUS_LABEL[proposal.status]} não pode ser aprovado.`);
    }
    const service = (await resolveService(tx, data.serviceId)) ||
      (proposal.serviceId && !data.serviceName ? { id: proposal.serviceId, name: proposal.serviceName } : null);
    const serviceName = data.serviceName || service?.name;
    if (!serviceName) throw ApiError.badRequest("Serviço contratado: selecione o pacote ou descreva o serviço.", [{ field: "serviceId", message: "Serviço obrigatório" }]);

    const res = await tx.proposal.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", approvedAt: new Date() } });
    if (res.count === 0) throw ApiError.conflict("Este orçamento já foi aprovado.");

    const { converted } = await contacts.convertToClient(tx, proposal.contactId, { userId: user?.id, reason: "orçamento aprovado" });

    const project = await tx.workProject.create({
      data: {
        contactId: proposal.contactId, proposalId: proposal.id,
        name: data.projectName || proposal.title,
        description: data.description !== undefined ? data.description : proposal.description,
        serviceId: data.serviceName ? null : service?.id ?? null, serviceName,
        contractedValue: fromCents(data.finalValue), paymentMode: payment.mode,
        startDate: data.startDate ?? null, dueDate: data.dueDate ?? null,
      },
    });
    const plan = await finance.createPaymentPlan(tx, {
      project, contact: proposal.contact, contractedCents: data.finalValue, payment, userId: user?.id,
    });

    const modeLabel = { ONE_TIME: "à vista", INSTALLMENTS: `parcelado em ${payment.count}x`, RECURRING: "mensalidade" }[payment.mode];
    await logActivity(tx, {
      entityType: "proposal", entityId: id, action: "approved", userId: user?.id,
      message: `Orçamento aprovado — ${serviceName}, ${modeLabel}`,
      data: { projectId: project.id, finalValue: data.finalValue, estimatedValue: proposal.estimatedValue?.toFixed(2) ?? null, contactConverted: converted },
    });
    await logActivity(tx, {
      entityType: "project", entityId: project.id, action: "created", userId: user?.id,
      message: `Projeto oficializado a partir do orçamento "${proposal.title}" (${plan.receivables} cobrança(s) gerada(s))`,
      data: { proposalId: id, paymentMode: payment.mode },
    });

    return tx.workProject.findUnique({
      where: { id: project.id },
      include: { contact: true, proposal: true, receivables: { orderBy: { dueDate: "asc" } }, recurring: true },
    });
  });
}

module.exports = { list, get, create, update, approve, reject, reopen, cancel };
