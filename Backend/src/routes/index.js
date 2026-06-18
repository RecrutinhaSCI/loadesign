// src/routes/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Roteador central — registra todas as sub-rotas da API Loa Design.
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require("express");

const router = Router();

// ── Health check ─────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "online",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// ── Públicas ─────────────────────────────────────────────────────────────────
router.use("/auth",         require("./auth.routes"));
router.use("/contact",      require("./contact.routes"));     // POST público; GET protegido
router.use("/services",     require("./services.routes"));    // GET público
router.use("/testimonials", require("./testimonials.routes")); // GET público
router.use("/portfolio",    require("./portfolio.routes"));   // GET público
router.use("/settings",     require("./settings.routes"));    // GET público

// ── Protegidas (admin) ───────────────────────────────────────────────────────
router.use("/leads",        require("./leads.routes"));
router.use("/clients",      require("./clients.routes"));
router.use("/projects",     require("./projects.routes"));
router.use("/quotes",       require("./quotes.routes"));
router.use("/transactions", require("./transactions.routes"));

module.exports = router;
