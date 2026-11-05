// src/routes/calendar.routes.js — agenda
const { Router } = require("express");
const svc = require("../services/calendar.service");
const { guard, ok, made } = require("./_commercial");

const router = Router();
router.use(...guard);

router.get("/", ok((req) => svc.list(req.query)));
router.post("/", made((req) => svc.create(req.body, req.user), "Compromisso agendado."));
router.patch("/:id", ok((req) => svc.update(req.params.id, req.body, req.user), "Compromisso atualizado."));

module.exports = router;
