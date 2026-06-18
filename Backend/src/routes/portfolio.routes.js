// src/routes/portfolio.routes.js
const { Router } = require("express");
const prisma = require("../config/prisma");
const { createCrudController } = require("../controllers/crudFactory");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const ctrl = createCrudController({
  model: prisma.portfolioItem,
  requiredFields: ["title", "imageUrl"],
  transformIn: (b) => { const d = { ...b }; delete d.id; return d; },
  orderBy: { order: "asc" },
});

// GET público
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);

router.use(requireAuth);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
