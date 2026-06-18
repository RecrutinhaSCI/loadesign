// src/utils/asyncHandler.js
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper para handlers async — encaminha erros automaticamente para next()
// Uso: router.get("/", asyncHandler(async (req, res) => { ... }))
// ─────────────────────────────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
