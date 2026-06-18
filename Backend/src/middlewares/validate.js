// src/middlewares/validate.js
// ─────────────────────────────────────────────────────────────────────────────
// Middleware que executa as regras do express-validator e,
// se houver erros, lança ApiError.unprocessable com os detalhes.
//
// Uso:
//   router.post("/", contactValidators, validate, contactController.create);
// ─────────────────────────────────────────────────────────────────────────────

const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

function validate(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((err) => ({
    field:   err.path,
    message: err.msg,
    value:   err.value,
  }));

  return next(ApiError.unprocessable("Dados de entrada inválidos.", details));
}

module.exports = validate;
