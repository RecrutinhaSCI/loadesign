// src/routes/receivables.routes.js — contas a receber
const { Router } = require("express");
const svc = require("../services/finance.service");
const { guard, ok } = require("./_commercial");

const router = Router();
router.use(...guard);

router.get("/", ok((req) => svc.listReceivables(req.query)));
router.get("/summary", ok(() => svc.summary()));
router.get("/:id", ok((req) => svc.getReceivable(req.params.id)));
router.patch("/:id", ok((req) => svc.updateReceivable(req.params.id, req.body, req.user), "Cobrança atualizada."));
router.post("/:id/receive", ok((req) => svc.receive(req.params.id, req.body, req.user), "Recebimento registrado."));
router.post("/:id/reverse", ok((req) => svc.reverse(req.params.id, req.body, req.user), "Recebimento estornado."));
router.post("/:id/cancel", ok((req) => svc.cancel(req.params.id, req.body, req.user), "Cobrança cancelada."));

module.exports = router;
