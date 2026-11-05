// src/routes/workProjects.routes.js — projetos oficializados
const { Router } = require("express");
const svc = require("../services/workProjects.service");
const { guard, ok } = require("./_commercial");

const router = Router();
router.use(...guard);

router.get("/", ok((req) => svc.list(req.query)));
router.get("/:id", ok((req) => svc.get(req.params.id)));
router.patch("/:id", ok((req) => svc.update(req.params.id, req.body, req.user), "Projeto atualizado."));
router.post("/:id/cancel", ok((req) => svc.cancel(req.params.id, req.body, req.user), "Projeto cancelado."));

module.exports = router;
