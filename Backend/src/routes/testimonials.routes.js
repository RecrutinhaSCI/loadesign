// src/routes/testimonials.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const ctrl = createCrudController({
  model: prisma.testimonial,
  requiredFields: ["name", "text"],
  transformIn: (b) => { const d = { ...b }; delete d.id; return d; },
  orderBy: { order: "asc" },
});

// GET público (site exibe depoimentos)
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);

router.use(requireAuth);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
