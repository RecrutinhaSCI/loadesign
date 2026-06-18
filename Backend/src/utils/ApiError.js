// src/utils/ApiError.js
// ─────────────────────────────────────────────────────────────────────────────
// Classe de erro customizada para respostas HTTP padronizadas.
// Uso: throw new ApiError(404, "Recurso não encontrado");
// ─────────────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (ex: 400, 404, 422, 500)
   * @param {string} message     - Mensagem legível
   * @param {any}    [details]   - Dados extras (ex: erros de validação)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details    = details;
    this.isApiError = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factories ──────────────────────────────────
  static badRequest(message = "Requisição inválida", details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Não autorizado") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Acesso negado") {
    return new ApiError(403, message);
  }

  static notFound(message = "Recurso não encontrado") {
    return new ApiError(404, message);
  }

  static unprocessable(message = "Dados inválidos", details = null) {
    return new ApiError(422, message, details);
  }

  static internal(message = "Erro interno do servidor") {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
