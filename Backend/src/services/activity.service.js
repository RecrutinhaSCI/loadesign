// src/services/activity.service.js
// Histórico de alterações relevantes do fluxo comercial (append-only).

const prisma = require("../config/prisma");

/** Registra um evento de histórico. `db` pode ser o client de uma transação. */
function logActivity(db, { entityType, entityId, action, message, data = null, userId = null }) {
  return db.activityLog.create({
    data: { entityType, entityId, action, message, data: data ?? undefined, userId },
  });
}

function historyOf(entityType, entityId, db = prisma) {
  return db.activityLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Diferenças simples entre dois objetos, para registrar "o que mudou". */
function diff(before, after) {
  const changes = {};
  for (const [k, v] of Object.entries(after)) {
    const a = before[k];
    const norm = (x) => (x && typeof x.toFixed === "function" ? x.toFixed(2) : x instanceof Date ? x.toISOString() : x ?? null);
    if (JSON.stringify(norm(a)) !== JSON.stringify(norm(v))) changes[k] = { from: norm(a), to: norm(v) };
  }
  return changes;
}

module.exports = { logActivity, historyOf, diff };
