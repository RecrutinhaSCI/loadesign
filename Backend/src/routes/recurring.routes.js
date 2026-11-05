// src/routes/recurring.routes.js — mensalidades
const { Router } = require("express");
const svc = require("../services/finance.service");
const { guard, ok } = require("./_commercial");

const router = Router();
router.use(...guard);

router.post("/:id/generate", ok((req) => svc.generateRecurring(req.params.id, req.body, req.user), "Cobranças geradas."));
router.post("/:id/pause", ok((req) => svc.setRecurringStatus(req.params.id, "PAUSED", req.user), "Mensalidade pausada."));
router.post("/:id/resume", ok((req) => svc.setRecurringStatus(req.params.id, "ACTIVE", req.user), "Mensalidade reativada."));
router.post("/:id/end", ok((req) => svc.setRecurringStatus(req.params.id, "ENDED", req.user), "Mensalidade encerrada."));

module.exports = router;
