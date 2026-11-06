// tests/support/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Carrega a API para os testes de integração COM o guard de testes aplicado
// antes de qualquer require da aplicação (env.js / PrismaClient).
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const { applyTestEnv, TEST_DB_NAME } = require("./testEnv");

// 1) Guard por configuração — lança antes de carregar a API.
applyTestEnv();

const bcrypt = require("bcryptjs");
const app = require("../../src/server");
const prisma = require("../../src/config/prisma");
const { loginRateLimit } = require("../../src/middlewares/loginRateLimit");

/**
 * 2) Guard por conexão real: confirma no próprio PostgreSQL que a sessão
 * está no banco de testes antes de qualquer escrita ou limpeza.
 */
async function assertConnectedToTestDb() {
  const rows = await prisma.$queryRaw`SELECT current_database() AS db`;
  const db = rows && rows[0] && rows[0].db;
  if (db !== TEST_DB_NAME) {
    throw new Error(`[TEST GUARD] Conexão ativa no banco "${db}", esperado "${TEST_DB_NAME}". Abortado.`);
  }
}

/** Limpa TODAS as tabelas — somente após confirmar o banco de testes. */
async function resetDatabase() {
  await assertConnectedToTestDb();
  await prisma.$transaction([
    // Fluxo comercial (ordem respeita as chaves estrangeiras)
    prisma.activityLog.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.receivable.deleteMany(),
    prisma.recurringAgreement.deleteMany(),
    prisma.workProject.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.contact.deleteMany(),
    // Legado
    prisma.contactMessage.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.service.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.portfolioItem.deleteMany(),
    prisma.agencySettings.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/** Cria um usuário com e-mail e senha sintéticos, gerados a cada execução. */
async function createUser({ active = true, role = "ADMIN" } = {}) {
  await assertConnectedToTestDb();
  const email = `admin.${crypto.randomBytes(4).toString("hex")}@example.test`;
  const password = crypto.randomBytes(12).toString("base64url");
  const user = await prisma.user.create({
    data: { name: "Admin Teste", email, password: await bcrypt.hash(password, 4), role, active },
  });
  return { user, email, password };
}

const { todayBR } = require("../../src/utils/dates");

module.exports = { app, prisma, assertConnectedToTestDb, resetDatabase, createUser, todayBR, loginRateLimit };
