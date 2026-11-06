// src/routes/contact.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contact é PÚBLICO (form do site público).
// Salva ContactMessage e gera Lead automaticamente.
// Demais rotas (listar, consultar, atualizar status, remover) exigem sessão
// administrativa.
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require("express");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = Router();

// POST público — recebe form do site, cria ContactMessage + Lead
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, phone, instagram, service, message } = req.body || {};

  if (!name || !phone || !message) {
    throw ApiError.badRequest("Informe pelo menos nome, telefone e mensagem.");
  }
  // Tipos e tamanhos máximos (formulário público: evita abuso de armazenamento).
  const LIMITS = { name: 120, email: 160, phone: 30, instagram: 60, service: 120, message: 5000 };
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = req.body[k];
    if (v != null && (typeof v !== "string" || v.length > max)) {
      throw ApiError.badRequest(`Campo "${k}" inválido ou longo demais (máx. ${max} caracteres).`);
    }
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

// ── Daqui pra baixo: somente administradores ────────────────────────────────
// Mensagens contêm dados pessoais (nome, telefone, e-mail): leitura exige
// sessão válida E papel administrativo; respostas sem cache.
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const STATUSES = ["NEW", "READ", "ARCHIVED"];
const SELECT = {
  id: true, name: true, email: true, phone: true, instagram: true, service: true,
  message: true, status: true, leadId: true, createdAt: true, updatedAt: true,
};

async function findOr404(id) {
  const msg = await prisma.contactMessage.findUnique({ where: { id: String(id) }, select: SELECT });
  if (!msg) throw ApiError.notFound("Mensagem não encontrada.");
  return msg;
}

// GET /api/contact?status=NEW|READ|ARCHIVED|all&search=&page=1&pageSize=20
router.get("/", asyncHandler(async (req, res) => {
  const status = String(req.query.status || "all").toUpperCase();
  if (status !== "ALL" && !STATUSES.includes(status)) throw ApiError.badRequest("Status inválido.");
  const search = String(req.query.search || "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = {};
  if (status !== "ALL") where.status = status;
  if (search) {
    where.OR = ["name", "email", "phone", "service", "message"].map((k) => ({ [k]: { contains: search, mode: "insensitive" } }));
  }
  const [items, total, grouped] = await Promise.all([
    prisma.contactMessage.findMany({ where, select: SELECT, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of grouped) counts[String(g.status).toUpperCase()] = (counts[String(g.status).toUpperCase()] || 0) + g._count._all;
  return success(res, { items, total, page, pageSize, counts });
}));

router.get("/:id", asyncHandler(async (req, res) => success(res, await findOr404(req.params.id))));

// PATCH /api/contact/:id  { status: "NEW" | "READ" | "ARCHIVED" } — só o status muda.
router.patch("/:id", asyncHandler(async (req, res) => {
  const status = String((req.body || {}).status || "").toUpperCase();
  if (!STATUSES.includes(status)) throw ApiError.badRequest("Status inválido. Use NEW, READ ou ARCHIVED.");
  await findOr404(req.params.id);
  const msg = await prisma.contactMessage.update({ where: { id: String(req.params.id) }, data: { status }, select: SELECT });
  return success(res, msg, "Mensagem atualizada.");
}));

// DELETE /api/contact/:id — remoção definitiva (ex.: pedido de exclusão de dados).
// O lead gerado pela mensagem NÃO é apagado.
router.delete("/:id", asyncHandler(async (req, res) => {
  await findOr404(req.params.id);
  await prisma.contactMessage.delete({ where: { id: String(req.params.id) } });
  return success(res, null, "Mensagem removida.");
}));

module.exports = router;
