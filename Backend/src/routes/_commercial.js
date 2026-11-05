// src/routes/_commercial.js
// Utilitários comuns às rotas do fluxo comercial: autenticação + papel e
// resposta serializada (Decimal → number, DATE → "AAAA-MM-DD").

const asyncHandler = require("../utils/asyncHandler");
const { success, created } = require("../utils/response");
const { serialize } = require("../utils/serialize");
const { requireAuth, requireRole } = require("../middlewares/auth");

// Papel administrativo atual ("ADMIN"); comparação sem diferenciar maiúsculas.
const COMMERCIAL_ROLES = ["ADMIN", "SUPER_ADMIN"];
const guard = [requireAuth, requireRole(...COMMERCIAL_ROLES)];

const ok = (fn, message) => asyncHandler(async (req, res) => success(res, serialize(await fn(req)), message));
const made = (fn, message) => asyncHandler(async (req, res) => created(res, serialize(await fn(req)), message));

module.exports = { guard, ok, made, COMMERCIAL_ROLES };
