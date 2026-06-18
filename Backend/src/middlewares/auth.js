// src/middlewares/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// Middleware de autenticação JWT.
// requireAuth → valida Bearer token e popula req.user
// requireRole → restringe acesso por papel
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");

function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("Token de acesso ausente.");
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.isApiError) return next(err);
    next(ApiError.unauthorized("Sessão expirada ou inválida."));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Permissão insuficiente."));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
