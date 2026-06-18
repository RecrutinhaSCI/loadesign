// src/routes/transactions.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const transformIn = (b) => {
  const data = { ...b };
  delete data.id;
  if ("date" in data && data.date) data.date = new Date(data.date);
  return data;
};
const transformOut = (r) => ({
  ...r,
  date: r.date?.toISOString?.() ?? r.date,
});

const ctrl = createCrudController({
  model: prisma.transaction,
  requiredFields: ["description", "type", "value", "date"],
  transformIn,
  transformOut,
  orderBy: { date: "desc" },
});

router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
