// src/utils/response.js
// ─────────────────────────────────────────────────────────────────────────────
// Helpers para respostas HTTP padronizadas.
// Garante que toda a API retorne o mesmo formato JSON.
//
// Formato de sucesso:
// { success: true, data: {...}, message: "..." }
//
// Formato de erro:
// { success: false, error: "...", details: [...] }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resposta de sucesso
 * @param {import('express').Response} res
 * @param {any}    data
 * @param {string} [message]
 * @param {number} [statusCode=200]
 */
function success(res, data = null, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Resposta de criação (201)
 */
function created(res, data = null, message = "Criado com sucesso") {
  return success(res, data, message, 201);
}

/**
 * Resposta de erro
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {any}    [details=null]
 */
function error(res, message = "Erro", statusCode = 400, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, created, error };
