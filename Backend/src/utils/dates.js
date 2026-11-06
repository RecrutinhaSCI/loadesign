// src/utils/dates.js
// ─────────────────────────────────────────────────────────────────────────────
// Datas de calendário (vencimentos, prazos) são "AAAA-MM-DD" sem horário,
// persistidas como DATE e representadas em JS como 00:00 UTC — assim nunca
// "voltam um dia" por causa do fuso. Instantes (agenda) são ISO com fuso.
// O "hoje" de negócio é sempre o de America/Sao_Paulo.
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_TZ = "America/Sao_Paulo";

function parseDateOnly(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > lastDayOfMonth(y, mo)) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

function lastDayOfMonth(year, month /* 1-12 */) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "Hoje" em São Paulo como "AAAA-MM-DD". */
function todayBR(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Data-only (Date UTC) com N meses somados, preservando `day` e limitando ao fim do mês. */
function addMonthsClamped(date, months, day = date.getUTCDate()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months; // 0-based, pode estourar
  const ty = y + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12 + 1;
  return new Date(Date.UTC(ty, tm - 1, Math.min(day, lastDayOfMonth(ty, tm))));
}

const competenceOf = (date) => formatDateOnly(date).slice(0, 7);

/** Vencimento da competência "AAAA-MM" no dia `dueDay` (29/30/31 → último dia do mês). */
function competenceDueDate(competence, dueDay) {
  const [y, m] = competence.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, Math.min(dueDay, lastDayOfMonth(y, m))));
}

/** Lista de competências entre `from` e `to` (inclusive), ambos "AAAA-MM". */
function competencesBetween(from, to) {
  const out = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function addCompetence(competence, months) {
  return competenceOf(addMonthsClamped(competenceDueDate(competence, 1), months, 1));
}

module.exports = {
  BUSINESS_TZ,
  parseDateOnly,
  formatDateOnly,
  lastDayOfMonth,
  todayBR,
  addMonthsClamped,
  competenceOf,
  competenceDueDate,
  competencesBetween,
  addCompetence,
};
