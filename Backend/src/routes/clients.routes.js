// src/routes/clients.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const ctrl = createCrudController({
  model: prisma.client,
  requiredFields: ["name", "email"],
  transformIn: (b) => {
    const data = { ...b };
    delete data.id;
    return data;
  },
});

router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
