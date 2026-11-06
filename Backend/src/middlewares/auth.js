// src/middlewares/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// requireAuth → valida o Bearer token E revalida o usuário no banco a cada
//               requisição: usuário removido ou desativado perde o acesso na
//               hora, sem esperar o JWT expirar. O papel vem do banco (não do
//               token), então mudanças de papel também valem imediatamente.
// requireRole → restringe por papel (comparação sem diferenciar maiúsculas).
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");
const prisma = require("../config/prisma");

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("Token de acesso ausente.");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized("Sessão expirada ou inválida.");
    }
    if (!payload || typeof payload.sub !== "string") {
      throw ApiError.unauthorized("Sessão expirada ou inválida.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!user || !user.active) {
      throw ApiError.unauthorized("Sessão encerrada. Faça login novamente.");
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    if (err.isApiError) return next(err);
    next(err);
  }
}

function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase());
  return (req, _res, next) => {
    if (!req.user || !allowed.includes(String(req.user.role || "").toUpperCase())) {
      return next(ApiError.forbidden("Permissão insuficiente."));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
