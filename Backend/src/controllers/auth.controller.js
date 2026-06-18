// src/controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Auth controller — login + me (current user).
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { signAccessToken } = require("../utils/jwt");
const { success } = require("../utils/response");

function sanitize(user) {
  const { password, ...safe } = user;
  void password;
  return safe;
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw ApiError.badRequest("Informe e-mail e senha.");
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) {
    throw ApiError.unauthorized("Credenciais inválidas.");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw ApiError.unauthorized("Credenciais inválidas.");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return success(res, {
    user: sanitize(user),
    tokens: { accessToken },
  }, "Login realizado com sucesso.");
});

/**
 * GET /api/auth/me
 * requireAuth → req.user.id
 */
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.unauthorized("Usuário não encontrado.");
  return success(res, sanitize(user));
});

/**
 * POST /api/auth/change-password
 * body: { currentPassword, newPassword }
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest("Informe senha atual e nova senha.");
  }
  if (newPassword.length < 8) {
    throw ApiError.badRequest("A nova senha precisa ter pelo menos 8 caracteres.");
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.unauthorized("Usuário não encontrado.");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw ApiError.unauthorized("Senha atual incorreta.");

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });

  return success(res, null, "Senha alterada com sucesso.");
});

module.exports = { login, me, changePassword };
