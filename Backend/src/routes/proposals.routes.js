// src/routes/proposals.routes.js — orçamentos e aprovação
const { Router } = require("express");
const svc = require("../services/proposals.service");
const { guard, ok, made } = require("./_commercial");

const router = Router();
router.use(...guard);

router.get("/", ok((req) => svc.list(req.query)));
router.get("/:id", ok((req) => svc.get(req.params.id)));
router.post("/", made((req) => svc.create(req.body, req.user), "Orçamento criado."));
router.patch("/:id", ok((req) => svc.update(req.params.id, req.body, req.user), "Orçamento atualizado."));
router.post("/:id/approve", made((req) => svc.approve(req.params.id, req.body, req.user), "Orçamento aprovado e projeto oficializado."));
router.post("/:id/reject", ok((req) => svc.reject(req.params.id, req.body, req.user), "Orçamento recusado."));
router.post("/:id/reopen", ok((req) => svc.reopen(req.params.id, req.body, req.user), "Orçamento reaberto."));
router.post("/:id/cancel", ok((req) => svc.cancel(req.params.id, req.body, req.user), "Orçamento cancelado."));

module.exports = router;
