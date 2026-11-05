// src/services/dashboard.service.js
// Métricas reais do fluxo comercial, calculadas no banco (sem dados fictícios).
// Cada número vem de uma única consulta agregada — sem contagem duplicada.

const prisma = require("../config/prisma");
const { parseDateOnly, todayBR, formatDateOnly } = require("../utils/dates");
const finance = require("./finance.service");

async function overview() {
  const today = parseDateOnly(todayBR());
  const in7 = new Date(today.getTime() + 7 * 86_400_000);
  const now = new Date();

  const [contactsByType, proposalsByStatus, activeProjects, money, events, dues, deadlines, activity] = await Promise.all([
    prisma.contact.groupBy({ by: ["type"], where: { archivedAt: null }, _count: { _all: true }, orderBy: { type: "asc" } }),
    prisma.proposal.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.workProject.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] } } }),
    finance.summary(),
    prisma.calendarEvent.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: now, lt: new Date(now.getTime() + 7 * 86_400_000) } },
      include: { contact: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { startsAt: "asc" }, take: 10,
    }),
    prisma.receivable.findMany({
      where: { status: "PENDING", dueDate: { gte: today, lte: in7 } },
      select: { id: true, description: true, amount: true, dueDate: true, contact: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" }, take: 10,
    }),
    prisma.workProject.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] }, dueDate: { gte: today, lte: in7 } },
      select: { id: true, name: true, dueDate: true, contact: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" }, take: 10,
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  const byType = Object.fromEntries(contactsByType.map((c) => [c.type, c._count._all]));
  const byStatus = Object.fromEntries(proposalsByStatus.map((p) => [p.status, p._count._all]));

  return {
    today: todayBR(),
    contacts: { total: (byType.CLIENT || 0) + (byType.PROSPECT || 0), clients: byType.CLIENT || 0, prospects: byType.PROSPECT || 0 },
    proposals: {
      pending: byStatus.PENDING || 0, approved: byStatus.APPROVED || 0,
      rejected: byStatus.REJECTED || 0, cancelled: byStatus.CANCELLED || 0,
    },
    projects: { active: activeProjects },
    finance: money,
    upcoming: {
      events,
      dues: dues.map((d) => ({ ...d, dueDate: formatDateOnly(d.dueDate) })),
      deadlines: deadlines.map((d) => ({ ...d, dueDate: formatDateOnly(d.dueDate) })),
    },
    activity,
  };
}

module.exports = { overview };
