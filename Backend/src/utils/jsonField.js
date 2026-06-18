// src/utils/jsonField.js
// ─────────────────────────────────────────────────────────────────────────────
// Helpers para serializar/desserializar campos armazenados como JSON em string
// (necessário porque SQLite não tem tipo JSON nativo).
// ─────────────────────────────────────────────────────────────────────────────

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

module.exports = { parseJson, serializeJson };
