// src/routes/quotes.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { parseJson, serializeJson } = require("../utils/jsonField");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const transformIn = (b) => {
  const data = { ...b };
  delete data.id;
  if ("items" in data) data.items = serializeJson(data.items) ?? "[]";
  if ("validUntil" in data && data.validUntil) data.validUntil = new Date(data.validUntil);
  return data;
};
const transformOut = (r) => ({
  ...r,
  items: parseJson(r.items, []),
  validUntil: r.validUntil?.toISOString?.() ?? r.validUntil,
});

const ctrl = createCrudController({
  model: prisma.quote,
  requiredFields: ["clientName", "validUntil"],
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
