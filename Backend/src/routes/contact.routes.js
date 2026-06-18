// src/routes/contact.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contact é PÚBLICO (form do site público).
// Salva ContactMessage e gera Lead automaticamente.
// Demais rotas (listar, atualizar status, deletar) são protegidas.
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require("express");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created } = require("../utils/response");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

// POST público — recebe form do site, cria ContactMessage + Lead
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, phone, instagram, service, message } = req.body || {};

  if (!name || !phone || !message) {
    throw ApiError.badRequest("Informe pelo menos nome, telefone e mensagem.");
  }

  const cleanEmail = (email || "").toLowerCase().trim();
  const fallbackEmail = cleanEmail || `${phone.replace(/\D/g, "")}@whatsapp.local`;

  // 1) Cria Lead correspondente (status: new)
  const lead = await prisma.lead.create({
    data: {
      name: name.trim(),
      email: fallbackEmail,
      phone: phone.trim(),
      company: null,
      website: instagram ? `https://instagram.com/${instagram.replace(/^@/, "")}` : null,
      source: "social",
      status: "new",
      service: service || "A definir",
      score: 50,
      value: 0,
      notes: message.trim(),
      tags: JSON.stringify(["site"]),
    },
  });

  // 2) Salva mensagem de contato com referência ao lead
  const contact = await prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: cleanEmail || null,
      phone: phone.trim(),
      instagram: instagram || null,
      service: service || null,
      message: message.trim(),
      leadId: lead.id,
    },
  });

  return created(res, {
    id: contact.id,
    leadId: lead.id,
  }, "Mensagem recebida! A Loa vai te chamar no WhatsApp em breve 🤍");
}));

// Daqui pra baixo: admin only
router.use(requireAuth);

router.get("/", asyncHandler(async (_req, res) => {
  const list = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return success(res, list);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const contact = await prisma.contactMessage.update({
    where: { id: req.params.id },
    data: { status },
  });
  return success(res, contact, "Atualizado.");
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: req.params.id } });
  return success(res, null, "Removido.");
}));

module.exports = router;
