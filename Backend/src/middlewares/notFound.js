function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.originalUrl}`,
  });
}

module.exports = notFound;