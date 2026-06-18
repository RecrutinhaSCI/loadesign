// src/routes/projects.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const transformIn = (b) => {
  const data = { ...b };
  delete data.id;
  if ("deadline" in data && data.deadline) data.deadline = new Date(data.deadline);
  // alias: o frontend manda `client` (nome), o model usa clientName
  if ("client" in data && !("clientName" in data)) {
    data.clientName = data.client;
    delete data.client;
  }
  return data;
};

const transformOut = (r) => ({
  ...r,
  client: r.clientName,                 // alias para o frontend
  deadline: r.deadline?.toISOString?.() ?? r.deadline,
});

const ctrl = createCrudController({
  model: prisma.project,
  requiredFields: ["name", "deadline"],
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
