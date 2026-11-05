// src/utils/serialize.js
// ─────────────────────────────────────────────────────────────────────────────
// Converte registros do Prisma para JSON da API:
//   Decimal         → number com 2 casas
//   Date (DATE)     → "AAAA-MM-DD"   (campos de calendário)
//   Date (instante) → ISO 8601 UTC
// ─────────────────────────────────────────────────────────────────────────────

const { Prisma } = require("@prisma/client");

const DATE_ONLY_FIELDS = new Set(["dueDate", "startDate", "endDate", "receivedAt"]);

function serialize(value, key) {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return Number(value.toFixed(2));
  if (value instanceof Date) {
    return DATE_ONLY_FIELDS.has(key) ? value.toISOString().slice(0, 10) : value.toISOString();
  }
  if (Array.isArray(value)) return value.map((v) => serialize(v));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v, k);
    return out;
  }
  return value;
}

module.exports = { serialize, DATE_ONLY_FIELDS };
