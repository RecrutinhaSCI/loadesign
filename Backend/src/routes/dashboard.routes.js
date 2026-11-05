// src/routes/dashboard.routes.js — métricas reais
const { Router } = require("express");
const svc = require("../services/dashboard.service");
const { guard, ok } = require("./_commercial");

const router = Router();
router.use(...guard);
router.get("/", ok(() => svc.overview()));

module.exports = router;
