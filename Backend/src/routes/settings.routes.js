// src/routes/settings.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Singleton — id fixo "singleton". GET cria com defaults se não existir.
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require("express");
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { parseJson, serializeJson } = require("../utils/jsonField");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const DEFAULTS = {
  id: "singleton",
  name: "Loa Design",
  email: "loadesigndigital@gmail.com",
  whatsapp: "5554999912694",
  instagram: "@loadesigndigital",
  website: "https://loadesign.com.br",
  ownerName: "Loa",
  ownerEmail: "loadesigndigital@gmail.com",
};

const out = (r) => ({ ...r, notifications: parseJson(r.notifications, {}) });

// GET é público — site público também consome (whatsapp/instagram)
router.get("/", asyncHandler(async (_req, res) => {
  let settings = await prisma.agencySettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await prisma.agencySettings.create({ data: DEFAULTS });
  }
  return success(res, out(settings));
}));

router.put("/", requireAuth, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = { ...body };
  delete data.id;
  delete data.createdAt;
  if ("notifications" in data) data.notifications = serializeJson(data.notifications);

  const settings = await prisma.agencySettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { ...DEFAULTS, ...data, id: "singleton" },
  });
  return success(res, out(settings), "Configurações salvas.");
}));

router.patch("/", requireAuth, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = { ...body };
  delete data.id;
  delete data.createdAt;
  if ("notifications" in data) data.notifications = serializeJson(data.notifications);

  const settings = await prisma.agencySettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { ...DEFAULTS, ...data, id: "singleton" },
  });
  return success(res, out(settings), "Configurações salvas.");
}));

module.exports = router;
