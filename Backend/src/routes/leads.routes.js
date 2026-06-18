// src/routes/leads.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { parseJson, serializeJson } = require("../utils/jsonField");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const transformIn = (b) => {
  const data = { ...b };
  if ("tags" in data) data.tags = serializeJson(data.tags) ?? "[]";
  if ("lastContactAt" in data && data.lastContactAt) data.lastContactAt = new Date(data.lastContactAt);
  // remove campos que não pertencem ao Lead (clientId vem de relação opcional)
  delete data.id;
  return data;
};

const transformOut = (r) => ({ ...r, tags: parseJson(r.tags, []) });

const ctrl = createCrudController({
  model: prisma.lead,
  requiredFields: ["name", "email"],
  transformIn,
  transformOut,
});

router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
