// src/routes/services.routes.js
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
  return data;
};
const transformOut = (r) => ({ ...r, items: parseJson(r.items, []) });

const ctrl = createCrudController({
  model: prisma.service,
  requiredFields: ["name", "slug"],
  transformIn,
  transformOut,
  orderBy: { price: "asc" },
});

// GET público (usado pelo site público), demais protegidas
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);

router.use(requireAuth);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
