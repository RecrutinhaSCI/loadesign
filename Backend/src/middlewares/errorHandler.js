// src/middlewares/errorHandler.js
// ─────────────────────────────────────────────────────────────────────────────
// Middleware global de tratamento de erros.
// Deve ser registrado ÚLTIMO no Express (após todas as rotas).
// ─────────────────────────────────────────────────────────────────────────────

const logger  = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const env     = require("../config/env");

/**
 * Trata erros do Prisma e os converte em respostas legíveis.
 */
function handlePrismaError(err) {
  switch (err.code) {
    case "P2002":
      return ApiError.badRequest(`Conflito: ${err.meta?.target?.join(", ")} já existe.`);
    case "P2025":
      return ApiError.notFound("Registro não encontrado.");
    case "P2003":
      return ApiError.badRequest("Violação de chave estrangeira.");
    default:
      return ApiError.internal("Erro de banco de dados.");
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Converte erros do Prisma
  if (err.code?.startsWith("P")) {
    err = handlePrismaError(err);
  }

  const statusCode = err.isApiError ? err.statusCode : 500;
  const message    = err.isApiError ? err.message : "Erro interno do servidor";
  const details    = err.details ?? null;

  // Log detalhado em desenvolvimento, resumido em produção
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${message}`, {
      stack: env.isDev ? err.stack : undefined,
      body:  env.isDev ? req.body  : undefined,
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} — ${statusCode}: ${message}`);
  }

  const body = { success: false, error: message };
  if (details) body.details = details;
  if (env.isDev && statusCode >= 500) body.stack = err.stack;

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
