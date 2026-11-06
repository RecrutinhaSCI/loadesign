// src/utils/validation.js
// ─────────────────────────────────────────────────────────────────────────────
// Validação com allowlist de campos para as rotas do fluxo comercial.
//
//   const data = validate(req.body, {
//     name:  t.string({ required: true, max: 120 }),
//     email: t.email({ nullable: true }),
//   }, { partial: false });
//
// - Somente os campos declarados no schema são devolvidos (mass assignment).
// - undefined  → campo ausente (erro se required e não partial).
// - null / ""  → limpa o campo se nullable; erro se required.
// - Erros → ApiError 400 com `details: [{ field, message }]`.
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("./ApiError");
const { toCents } = require("./money");
const { parseDateOnly } = require("./dates");

class FieldError extends Error {}

const fail = (msg) => { throw new FieldError(msg); };

const t = {
  string: ({ min = 1, max = 500, ...o } = {}) => ({
    ...o,
    parse: (v) => {
      if (typeof v !== "string" && typeof v !== "number") fail("deve ser texto");
      const s = String(v).trim();
      if (s.length < min) fail(`deve ter pelo menos ${min} caractere(s)`);
      if (s.length > max) fail(`deve ter no máximo ${max} caracteres`);
      return s;
    },
  }),
  email: (o = {}) => ({
    ...o,
    parse: (v) => {
      const s = String(v).trim().toLowerCase();
      if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail("e-mail inválido");
      return s;
    },
  }),
  enum: (values, o = {}) => ({
    ...o,
    parse: (v) => {
      const s = String(v).trim().toUpperCase();
      if (!values.includes(s)) fail(`valor inválido (use: ${values.join(", ")})`);
      return s;
    },
  }),
  int: ({ min = -Infinity, max = Infinity, ...o } = {}) => ({
    ...o,
    parse: (v) => {
      const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
      if (!Number.isInteger(n)) fail("deve ser um número inteiro");
      if (n < min || n > max) fail(`deve estar entre ${min} e ${max}`);
      return n;
    },
  }),
  /** Dinheiro → centavos (inteiro). Aceita 1234.5, "1234,50", "1.234,50". */
  money: ({ min = 1, ...o } = {}) => ({
    ...o,
    parse: (v) => {
      const cents = toCents(v);
      if (cents === null) fail("valor monetário inválido");
      if (cents < min) fail(min > 0 ? "deve ser maior que zero" : "não pode ser negativo");
      if (cents > 99999999999) fail("valor muito alto");
      return cents;
    },
  }),
  /** Data de calendário "AAAA-MM-DD" → Date (00:00 UTC). */
  date: (o = {}) => ({
    ...o,
    parse: (v) => {
      const d = parseDateOnly(v);
      if (!d) fail("data inválida (use AAAA-MM-DD)");
      return d;
    },
  }),
  /** Instante ISO 8601 com fuso (ex.: 2026-11-04T14:00:00-03:00). */
  datetime: (o = {}) => ({
    ...o,
    parse: (v) => {
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) fail("data/hora inválida");
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) fail("data/hora inválida");
      return d;
    },
  }),
  bool: (o = {}) => ({
    ...o,
    parse: (v) => {
      if (v === true || v === "true") return true;
      if (v === false || v === "false") return false;
      return fail("deve ser verdadeiro ou falso");
    },
  }),
  id: (o = {}) => ({
    ...o,
    parse: (v) => {
      const s = String(v).trim();
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) fail("identificador inválido");
      return s;
    },
  }),
  competence: (o = {}) => ({
    ...o,
    parse: (v) => {
      const s = String(v).trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) fail("competência inválida (use AAAA-MM)");
      return s;
    },
  }),
  array: (item, { min = 0, max = 100, ...o } = {}) => ({
    ...o,
    parse: (v) => {
      if (!Array.isArray(v)) fail("deve ser uma lista");
      if (v.length < min || v.length > max) fail(`deve ter entre ${min} e ${max} itens`);
      return v.map((x, i) => {
        try {
          return item.parse(x);
        } catch (err) {
          if (err instanceof FieldError) fail(`item ${i + 1}: ${err.message}`);
          throw err;
        }
      });
    },
  }),
};

const isBlank = (v) => v === null || (typeof v === "string" && v.trim() === "");

function validate(body, schema, { partial = false, labels = {} } = {}) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const out = {};
  const errors = [];

  for (const [field, rule] of Object.entries(schema)) {
    const raw = src[field];
    const label = labels[field] || field;
    if (raw === undefined) {
      if (rule.required && !partial) errors.push({ field, message: `${label}: campo obrigatório` });
      else if (rule.default !== undefined && !partial) out[field] = rule.default;
      continue;
    }
    if (isBlank(raw)) {
      if (rule.required) errors.push({ field, message: `${label}: campo obrigatório` });
      else if (rule.nullable) out[field] = null;
      continue;
    }
    try {
      out[field] = rule.parse(raw);
    } catch (err) {
      if (!(err instanceof FieldError)) throw err;
      errors.push({ field, message: `${label}: ${err.message}` });
    }
  }

  if (errors.length) throw ApiError.badRequest(errors[0].message, errors);
  return out;
}

/** Paginação padrão: ?page=1&pageSize=20 (máx. 100). */
function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function pageResult(items, total, { page, pageSize }) {
  return { items, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

module.exports = { t, validate, parsePagination, pageResult };
