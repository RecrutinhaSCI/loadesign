// src/routes/contacts.routes.js — cadastro unificado (clientes e prospects)
const { Router } = require("express");
const svc = require("../services/contacts.service");
const legacy = require("../services/legacyImport.service");
const ApiError = require("../utils/ApiError");
const { guard, ok, made } = require("./_commercial");

const router = Router();
router.use(...guard);

router.get("/", ok((req) => svc.list(req.query)));
router.get("/duplicates", ok((req) => svc.checkDuplicates(req.query)));
router.get("/legacy-import", ok(() => legacy.preview()));
router.post("/legacy-import", ok((req) => {
  if (req.body?.confirm !== true) throw ApiError.badRequest("Confirme a importação com { confirm: true }.");
  return legacy.apply(req.user);
}, "Importação concluída."));
router.get("/:id", ok((req) => svc.get(req.params.id)));
router.post("/", made((req) => svc.create(req.body, req.user), "Contato cadastrado."));
router.patch("/:id", ok((req) => svc.update(req.params.id, req.body, req.user), "Contato atualizado."));
router.post("/:id/convert", ok((req) => svc.convert(req.params.id, req.user), "Prospect convertido em cliente."));
router.post("/:id/archive", ok((req) => svc.setArchived(req.params.id, true, req.user), "Contato arquivado."));
router.post("/:id/unarchive", ok((req) => svc.setArchived(req.params.id, false, req.user), "Contato reativado."));

module.exports = router;
