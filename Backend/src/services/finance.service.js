// src/services/finance.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Contas a receber, baixas e mensalidades.
//
// Regras:
// - Valor PENDENTE nunca é receita. Receita = contas RECEBIDAS.
// - Baixa = conta RECEIVED + lançamento (Transaction legado, income) na MESMA
//   transação. Baixa dupla é impedida por atualização condicional
//   (status PENDING → RECEIVED) e pelo vínculo único transactionId.
// - Nada é apagado: cancelamento e estorno mudam status, registram motivo e
//   histórico; o estorno gera um lançamento de saída "Estorno de recebimento".
// - Parcelas: soma exata do contratado (centavos inteiros).
// - Mensalidades: geração sob demanda, sem duplicar (único por competência);
//   dias 29/30/31 caem no último dia dos meses mais curtos.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { t, validate, parsePagination, pageResult } = require("../utils/validation");
const { toCents, fromCents, centsToNumber, splitCents } = require("../utils/money");
const {
  parseDateOnly, formatDateOnly, todayBR, addMonthsClamped, competenceOf,
  competenceDueDate, competencesBetween, addCompetence,
} = require("../utils/dates");
const { logActivity, historyOf } = require("./activity.service");

const METHODS = ["PIX", "CARD", "BOLETO", "CASH", "OTHER"];
const METHOD_LABEL = { PIX: "PIX", CARD: "Cartão", BOLETO: "Boleto", CASH: "Dinheiro", OTHER: "Outros" };
const MAX_INSTALLMENTS = 48;
const MAX_MONTHS_AHEAD = 24;

// ─── Plano de pagamento (aprovação) ──────────────────────────────────────────

const paymentSchemas = {
  ONE_TIME: {
    mode: t.enum(["ONE_TIME"], { required: true }),
    dueDate: t.date({ required: true }),
    method: t.enum(METHODS, { nullable: true }),
  },
  INSTALLMENTS: {
    mode: t.enum(["INSTALLMENTS"], { required: true }),
    count: t.int({ required: true, min: 2, max: MAX_INSTALLMENTS }),
    firstDueDate: t.date({ required: true }),
    dueDates: t.array(t.date(), { min: 2, max: MAX_INSTALLMENTS }),
    method: t.enum(METHODS, { nullable: true }),
  },
  RECURRING: {
    mode: t.enum(["RECURRING"], { required: true }),
    dueDay: t.int({ required: true, min: 1, max: 31 }),
    startDate: t.date({ required: true }),
    endDate: t.date({ nullable: true }),
    method: t.enum(METHODS, { nullable: true }),
    generateUntil: t.competence({ nullable: true }),
  },
};

const PAYMENT_LABELS = {
  mode: "Modalidade", dueDate: "Vencimento", count: "Quantidade de parcelas", firstDueDate: "1º vencimento",
  dueDates: "Vencimentos", method: "Forma de pagamento", dueDay: "Dia de vencimento", startDate: "Início",
  endDate: "Término", generateUntil: "Gerar até",
};

function parsePayment(payment) {
  const mode = String(payment?.mode || "").toUpperCase();
  const schema = paymentSchemas[mode];
  if (!schema) throw ApiError.badRequest("Modalidade de pagamento: escolha à vista, parcelado ou mensalidade.", [{ field: "payment.mode", message: "Modalidade inválida" }]);
  const p = validate({ ...payment, mode }, schema, { labels: PAYMENT_LABELS });

  if (mode === "INSTALLMENTS") {
    if (p.dueDates) {
      if (p.dueDates.length !== p.count) throw ApiError.badRequest("Vencimentos: informe uma data para cada parcela.");
      for (let i = 1; i < p.dueDates.length; i++) {
        if (p.dueDates[i] < p.dueDates[i - 1]) throw ApiError.badRequest("Vencimentos: as datas das parcelas devem estar em ordem.");
      }
    } else {
      p.dueDates = Array.from({ length: p.count }, (_, i) => addMonthsClamped(p.firstDueDate, i));
    }
  }
  if (mode === "RECURRING") {
    if (p.endDate && p.endDate < p.startDate) throw ApiError.badRequest("Término: deve ser posterior ao início.");
    const first = firstRecurringCompetence(p.startDate, p.dueDay);
    p.generateUntil = p.generateUntil || first;
    assertGenerationHorizon(p.generateUntil);
    if (p.generateUntil < first) throw ApiError.badRequest("Gerar até: deve ser igual ou posterior ao primeiro mês da mensalidade.");
  }
  return p;
}

/** Primeira competência cujo vencimento não é anterior à data de início. */
function firstRecurringCompetence(startDate, dueDay) {
  const c = competenceOf(startDate);
  return competenceDueDate(c, dueDay) < startDate ? addCompetence(c, 1) : c;
}

function assertGenerationHorizon(until) {
  const limit = addCompetence(todayBR().slice(0, 7), MAX_MONTHS_AHEAD);
  if (until > limit) throw ApiError.badRequest(`Gerar até: limite de ${MAX_MONTHS_AHEAD} meses à frente (${limit}).`);
}

/**
 * Cria cobranças/mensalidade do projeto recém-oficializado (dentro da tx).
 * @returns {{ receivables: number, recurringId: string|null }}
 */
async function createPaymentPlan(tx, { project, contact, contractedCents, payment, userId }) {
  const base = { contactId: contact.id, projectId: project.id };
  const label = project.name;

  if (payment.mode === "ONE_TIME") {
    await tx.receivable.create({
      data: {
        ...base, kind: "ONE_TIME", installmentNumber: 1, installmentCount: 1,
        description: `${label} — pagamento à vista`, amount: fromCents(contractedCents),
        dueDate: payment.dueDate, paymentMethod: payment.method ?? null,
      },
    });
    return { receivables: 1, recurringId: null };
  }

  if (payment.mode === "INSTALLMENTS") {
    const parts = splitCents(contractedCents, payment.count);
    await tx.receivable.createMany({
      data: parts.map((cents, i) => ({
        ...base, kind: "INSTALLMENT", installmentNumber: i + 1, installmentCount: payment.count,
        description: `${label} — parcela ${i + 1}/${payment.count}`, amount: fromCents(cents),
        dueDate: payment.dueDates[i], paymentMethod: payment.method ?? null,
      })),
    });
    return { receivables: parts.length, recurringId: null };
  }

  // RECURRING
  const agreement = await tx.recurringAgreement.create({
    data: {
      projectId: project.id, contactId: contact.id, amount: fromCents(contractedCents),
      dueDay: payment.dueDay, startDate: payment.startDate, endDate: payment.endDate ?? null,
      paymentMethod: payment.method ?? null,
    },
  });
  await logActivity(tx, {
    entityType: "recurring", entityId: agreement.id, action: "created", userId,
    message: `Mensalidade de ${fmtBRL(contractedCents)} com vencimento todo dia ${payment.dueDay}`,
    data: { projectId: project.id },
  });
  const { created } = await generateCharges(tx, agreement, { until: payment.generateUntil, project });
  return { receivables: created, recurringId: agreement.id };
}

const fmtBRL = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centsToNumber(cents));

// ─── Mensalidades ────────────────────────────────────────────────────────────

async function generateCharges(tx, agreement, { from, until, project }) {
  const first = firstRecurringCompetence(agreement.startDate, agreement.dueDay);
  const start = from && from > first ? from : first;
  const lastAllowed = agreement.endDate ? competenceOf(agreement.endDate) : until;
  const end = until < lastAllowed ? until : lastAllowed;
  if (end < start) return { created: 0, skipped: 0, competences: [] };

  const proj = project || (await tx.workProject.findUnique({ where: { id: agreement.projectId }, select: { name: true } }));
  const rows = competencesBetween(start, end)
    .map((competence) => ({ competence, dueDate: competenceDueDate(competence, agreement.dueDay) }))
    .filter(({ dueDate }) => dueDate >= agreement.startDate && (!agreement.endDate || dueDate <= agreement.endDate))
    .map(({ competence, dueDate }) => ({
      contactId: agreement.contactId, projectId: agreement.projectId, recurringId: agreement.id,
      kind: "RECURRING", competence, dueDate, amount: agreement.amount,
      description: `${proj.name} — mensalidade ${competence.slice(5)}/${competence.slice(0, 4)}`,
      paymentMethod: agreement.paymentMethod,
    }));
  if (!rows.length) return { created: 0, skipped: 0, competences: [] };

  // ON CONFLICT DO NOTHING sobre @@unique([recurringId, competence])
  const res = await tx.receivable.createMany({ data: rows, skipDuplicates: true });
  return { created: res.count, skipped: rows.length - res.count, competences: rows.map((r) => r.competence) };
}

async function generateRecurring(id, body, user) {
  const { from, until } = validate(body, {
    from: t.competence({ nullable: true }),
    until: t.competence({ required: true }),
  }, { labels: { from: "A partir de", until: "Gerar até" } });
  assertGenerationHorizon(until);
  if (from && from > until) throw ApiError.badRequest("Período inválido: início depois do fim.");

  return prisma.$transaction(async (tx) => {
    const agreement = await tx.recurringAgreement.findUnique({ where: { id } });
    if (!agreement) throw ApiError.notFound("Mensalidade não encontrada.");
    if (agreement.status !== "ACTIVE") throw ApiError.conflict("Mensalidade pausada ou encerrada: reative antes de gerar cobranças.");
    const result = await generateCharges(tx, agreement, { from, until });
    if (result.created) {
      await logActivity(tx, {
        entityType: "recurring", entityId: id, action: "generated", userId: user?.id,
        message: `${result.created} cobrança(s) gerada(s) até ${until}`,
        data: { from: from || null, until, skipped: result.skipped },
      });
    }
    return result;
  });
}

async function setRecurringStatus(id, status, user) {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.recurringAgreement.findUnique({ where: { id } });
    if (!agreement) throw ApiError.notFound("Mensalidade não encontrada.");
    if (agreement.status === "ENDED") throw ApiError.conflict("Mensalidade encerrada não pode ser alterada.");
    if (agreement.status === status) return { agreement, cancelledCharges: 0 };

    const data = { status };
    let cancelledCharges = 0;
    if (status === "ENDED") {
      const today = parseDateOnly(todayBR());
      data.endDate = agreement.endDate && agreement.endDate < today ? agreement.endDate : today;
      // Cobranças futuras ainda pendentes deixam de valer (registradas como canceladas)
      const res = await tx.receivable.updateMany({
        where: { recurringId: id, status: "PENDING", dueDate: { gt: today } },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Mensalidade encerrada" },
      });
      cancelledCharges = res.count;
    }
    const updated = await tx.recurringAgreement.update({ where: { id }, data });
    const msg = { ACTIVE: "Mensalidade reativada", PAUSED: "Mensalidade pausada", ENDED: "Mensalidade encerrada" }[status];
    await logActivity(tx, {
      entityType: "recurring", entityId: id, action: status.toLowerCase(), userId: user?.id,
      message: cancelledCharges ? `${msg}; ${cancelledCharges} cobrança(s) futura(s) cancelada(s)` : msg,
    });
    return { agreement: updated, cancelledCharges };
  });
}

// ─── Contas a receber ────────────────────────────────────────────────────────

const RECEIVABLE_INCLUDE = {
  contact: { select: { id: true, name: true, phone: true, type: true } },
  project: { select: { id: true, name: true, status: true } },
};

function receivableWhere(query) {
  const where = {};
  const today = parseDateOnly(todayBR());
  const status = String(query.status || "").toUpperCase();
  if (status === "OVERDUE") Object.assign(where, { status: "PENDING", dueDate: { lt: today } });
  else if (["PENDING", "RECEIVED", "CANCELLED"].includes(status)) where.status = status;

  const from = parseDateOnly(query.from);
  const to = parseDateOnly(query.to);
  if (from || to) {
    const field = status === "RECEIVED" ? "receivedAt" : "dueDate";
    where[field] = { ...(where[field] || {}), ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  if (query.contactId) where.contactId = String(query.contactId);
  if (query.projectId) where.projectId = String(query.projectId);
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { contact: { name: { contains: search, mode: "insensitive" } } },
      { project: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listReceivables(query = {}) {
  const pg = parsePagination({ pageSize: 50, ...query });
  const where = receivableWhere(query);
  const [items, total, sums] = await prisma.$transaction([
    prisma.receivable.findMany({ where, include: RECEIVABLE_INCLUDE, orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }], skip: pg.skip, take: pg.take }),
    prisma.receivable.count({ where }),
    prisma.receivable.aggregate({ where, _sum: { amount: true, receivedAmount: true } }),
  ]);
  const result = pageResult(items, total, pg);
  result.totals = { amount: sums._sum.amount ?? 0, receivedAmount: sums._sum.receivedAmount ?? 0 };
  return result;
}

async function getReceivable(id) {
  const r = await prisma.receivable.findUnique({ where: { id }, include: RECEIVABLE_INCLUDE });
  if (!r) throw ApiError.notFound("Conta a receber não encontrada.");
  return { ...r, history: await historyOf("receivable", id) };
}

async function receive(id, body, user) {
  const data = validate(body, {
    method: t.enum(METHODS, { required: true }),
    receivedAt: t.date({}),
    receivedAmount: t.money({}),
    notes: t.string({ nullable: true, max: 1000 }),
  }, { labels: { method: "Forma de pagamento", receivedAt: "Data do recebimento", receivedAmount: "Valor recebido", notes: "Observações" } });
  const receivedAt = data.receivedAt || parseDateOnly(todayBR());
  if (formatDateOnly(receivedAt) > todayBR()) throw ApiError.badRequest("Data do recebimento: não pode ser futura.");

  return prisma.$transaction(async (tx) => {
    const current = await tx.receivable.findUnique({ where: { id }, include: RECEIVABLE_INCLUDE });
    if (!current) throw ApiError.notFound("Conta a receber não encontrada.");
    const receivedCents = data.receivedAmount ?? toCents(current.amount);

    // Atualização condicional: só uma requisição consegue dar baixa.
    const res = await tx.receivable.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "RECEIVED", receivedAt, receivedAmount: fromCents(receivedCents), paymentMethod: data.method, ...(data.notes !== undefined ? { notes: data.notes } : {}) },
    });
    if (res.count === 0) {
      throw ApiError.conflict(current.status === "RECEIVED" ? "Esta conta já foi recebida." : "Conta cancelada não pode ser recebida.");
    }

    const transaction = await tx.transaction.create({
      data: {
        description: current.description, client: current.contact.name, type: "income",
        value: centsToNumber(receivedCents), date: receivedAt, category: "Recebimentos",
      },
    });
    const updated = await tx.receivable.update({ where: { id }, data: { transactionId: transaction.id }, include: RECEIVABLE_INCLUDE });
    await logActivity(tx, {
      entityType: "receivable", entityId: id, action: "received", userId: user?.id,
      message: `Recebimento de ${fmtBRL(receivedCents)} via ${METHOD_LABEL[data.method]} em ${formatDateOnly(receivedAt).split("-").reverse().join("/")}`,
      data: { transactionId: transaction.id, expected: toCents(current.amount), received: receivedCents },
    });
    return updated;
  });
}

async function reverse(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ required: true, min: 3, max: 500 }) }, { labels: { reason: "Motivo" } });
  return prisma.$transaction(async (tx) => {
    const current = await tx.receivable.findUnique({ where: { id }, include: RECEIVABLE_INCLUDE });
    if (!current) throw ApiError.notFound("Conta a receber não encontrada.");
    const res = await tx.receivable.updateMany({
      where: { id, status: "RECEIVED" },
      data: { status: "PENDING", receivedAt: null, receivedAmount: null, transactionId: null },
    });
    if (res.count === 0) throw ApiError.conflict("Somente contas recebidas podem ser estornadas.");

    const cents = toCents(current.receivedAmount);
    const reversal = await tx.transaction.create({
      data: {
        description: `Estorno: ${current.description}`, client: current.contact.name, type: "expense",
        value: centsToNumber(cents), date: parseDateOnly(todayBR()), category: "Estorno de recebimento",
      },
    });
    await logActivity(tx, {
      entityType: "receivable", entityId: id, action: "reversed", userId: user?.id,
      message: `Recebimento estornado (${fmtBRL(cents)}): ${reason}`,
      data: { originalTransactionId: current.transactionId, reversalTransactionId: reversal.id, receivedAt: current.receivedAt },
    });
    return tx.receivable.findUnique({ where: { id }, include: RECEIVABLE_INCLUDE });
  });
}

async function cancel(id, body, user) {
  const { reason } = validate(body, { reason: t.string({ required: true, min: 3, max: 500 }) }, { labels: { reason: "Motivo" } });
  return prisma.$transaction(async (tx) => {
    const res = await tx.receivable.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    if (res.count === 0) {
      const exists = await tx.receivable.findUnique({ where: { id }, select: { status: true } });
      if (!exists) throw ApiError.notFound("Conta a receber não encontrada.");
      throw ApiError.conflict(exists.status === "RECEIVED" ? "Conta recebida: faça o estorno antes de cancelar." : "Conta já cancelada.");
    }
    await logActivity(tx, { entityType: "receivable", entityId: id, action: "cancelled", userId: user?.id, message: `Cobrança cancelada: ${reason}` });
    return tx.receivable.findUnique({ where: { id }, include: RECEIVABLE_INCLUDE });
  });
}

async function updateReceivable(id, body, user) {
  const data = validate(body, {
    dueDate: t.date({}),
    paymentMethod: t.enum(METHODS, { nullable: true }),
    notes: t.string({ nullable: true, max: 1000 }),
  }, { partial: true, labels: { dueDate: "Vencimento", paymentMethod: "Forma de pagamento", notes: "Observações" } });
  return prisma.$transaction(async (tx) => {
    const current = await tx.receivable.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Conta a receber não encontrada.");
    if (current.status !== "PENDING") throw ApiError.conflict("Somente cobranças pendentes podem ser editadas.");
    const updated = await tx.receivable.update({ where: { id }, data, include: RECEIVABLE_INCLUDE });
    if (data.dueDate && formatDateOnly(data.dueDate) !== formatDateOnly(current.dueDate)) {
      await logActivity(tx, {
        entityType: "receivable", entityId: id, action: "rescheduled", userId: user?.id,
        message: `Vencimento alterado de ${formatDateOnly(current.dueDate)} para ${formatDateOnly(data.dueDate)}`,
      });
    }
    return updated;
  });
}

/** Totais financeiros separados por natureza (sem misturar previsto e recebido). */
async function summary() {
  const today = parseDateOnly(todayBR());
  const monthStart = parseDateOnly(`${todayBR().slice(0, 7)}-01`);
  const [estimated, contracted, recurring, pending, overdue, received, receivedMonth] = await prisma.$transaction([
    prisma.proposal.aggregate({ where: { status: "PENDING" }, _sum: { estimatedValue: true }, _count: true }),
    prisma.workProject.aggregate({ where: { status: { not: "CANCELLED" }, paymentMode: { not: "RECURRING" } }, _sum: { contractedValue: true }, _count: true }),
    prisma.recurringAgreement.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true }, _count: true }),
    prisma.receivable.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.receivable.aggregate({ where: { status: "PENDING", dueDate: { lt: today } }, _sum: { amount: true }, _count: true }),
    prisma.receivable.aggregate({ where: { status: "RECEIVED" }, _sum: { receivedAmount: true }, _count: true }),
    prisma.receivable.aggregate({ where: { status: "RECEIVED", receivedAt: { gte: monthStart } }, _sum: { receivedAmount: true }, _count: true }),
  ]);
  return {
    today: todayBR(),
    estimated: { amount: estimated._sum.estimatedValue ?? 0, count: estimated._count },
    contracted: { amount: contracted._sum.contractedValue ?? 0, count: contracted._count },
    recurringMonthly: { amount: recurring._sum.amount ?? 0, count: recurring._count },
    pending: { amount: pending._sum.amount ?? 0, count: pending._count },
    overdue: { amount: overdue._sum.amount ?? 0, count: overdue._count },
    received: { amount: received._sum.receivedAmount ?? 0, count: received._count },
    receivedThisMonth: { amount: receivedMonth._sum.receivedAmount ?? 0, count: receivedMonth._count },
  };
}

module.exports = {
  METHODS, parsePayment, createPaymentPlan, firstRecurringCompetence,
  generateRecurring, setRecurringStatus, generateCharges,
  listReceivables, getReceivable, receive, reverse, cancel, updateReceivable, summary,
};
