// src/utils/money.js
// ─────────────────────────────────────────────────────────────────────────────
// Dinheiro em CENTAVOS inteiros dentro do código; Decimal(12,2) no banco.
// Nunca usa aritmética de ponto flutuante para somar ou dividir valores.
// ─────────────────────────────────────────────────────────────────────────────

/** Converte número, string ("1.234,56" / "1234.56") ou Prisma.Decimal em centavos. */
function toCents(value) {
  if (value === null || value === undefined || value === "") return null;
  let s;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    s = value.toFixed(2);
  } else if (typeof value === "object" && typeof value.toFixed === "function") {
    s = value.toFixed(2); // Prisma.Decimal
  } else if (typeof value === "string") {
    s = value.trim().replace(/^R\$\s*/i, "");
    if (/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
  } else {
    return null;
  }
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] || "0").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return m[1] ? -cents : cents;
}

/** Centavos → string decimal "1234.56" (aceita pelo Prisma para Decimal). */
function fromCents(cents) {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Centavos → number com 2 casas (para respostas JSON e o legado Float). */
const centsToNumber = (cents) => Number(fromCents(cents));

/**
 * Divide `total` centavos em `n` parcelas cuja soma é exatamente `total`.
 * Os centavos que sobram vão, um a um, para as primeiras parcelas.
 * Ex.: 100000 / 3 → [33334, 33333, 33333]
 */
function splitCents(total, n) {
  if (!Number.isInteger(total) || !Number.isInteger(n) || n < 1) throw new Error("splitCents: argumentos inválidos");
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

module.exports = { toCents, fromCents, centsToNumber, splitCents };
