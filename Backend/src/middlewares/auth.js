// src/middlewares/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// requireAuth → valida o Bearer token E revalida o usuário no banco a cada
//               requisição: usuário removido ou desativado perde o acesso na
//               hora, sem esperar o JWT expirar. O papel vem do banco (não do
//               token), então mudanças de papel também valem imediatamente.
//               Trocar a senha invalida todos os tokens anteriores (versão de
//               sessão "sv" no token, derivada do hash atual — ver utils/jwt).
// requireRole → restringe por papel (comparação sem diferenciar maiúsculas).
// requireAdmin → requireAuth + papel administrativo (ADMIN / SUPER_ADMIN).
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");
const { verifyAccessToken, sessionVersionMatches } = require("../utils/jwt");
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
      select: { id: true, email: true, role: true, active: true, password: true },
    });
    // Usuário removido/desativado ou senha trocada depois da emissão do token
    // (versão de sessão diferente) → a sessão deixa de valer na hora.
    if (!user || !user.active || !sessionVersionMatches(payload.sv, user.password)) {
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

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const requireAdmin = [requireAuth, requireRole(...ADMIN_ROLES)];

module.exports = { requireAuth, requireRole, requireAdmin, ADMIN_ROLES };
