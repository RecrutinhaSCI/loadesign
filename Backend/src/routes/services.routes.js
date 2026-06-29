// src/routes/services.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Duas rotas distintas:
//   GET /api/services/public  → público, só active, SEM o campo price
//   GET /api/services         → admin (auth), retorna TUDO
//   POST/PATCH/PUT/DELETE     → admin (auth)
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require("express");
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
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

// ─── GET público — site institucional ────────────────────────────────────────
// Retorna apenas serviços ativos, ordenados, sem expor preço.
router.get("/public", asyncHandler(async (_req, res) => {
  const all = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ price: "asc" }, { createdAt: "asc" }],
  });
  // Omite price intencionalmente — site público nunca expõe valor.
  const sanitized = all.map((s) => {
    const { price: _price, ...rest } = s;
    void _price;
    return transformOut(rest);
  });
  return success(res, sanitized);
}));

// ─── CRUD admin ──────────────────────────────────────────────────────────────
const ctrl = createCrudController({
  model: prisma.service,
  requiredFields: ["name", "slug"],
  transformIn,
  transformOut,
  orderBy: { price: "asc" },
});

// Todas as rotas abaixo são protegidas
router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/:id", ctrl.show);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
