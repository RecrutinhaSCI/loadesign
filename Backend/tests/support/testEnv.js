// tests/support/testEnv.js
// ─────────────────────────────────────────────────────────────────────────────
// Guard do ambiente de TESTES automatizados.
//
// Regras (todas obrigatórias; qualquer falha interrompe ANTES de conectar):
//   1) As variáveis de banco/ambiente vêm SOMENTE de Backend/.env.test.
//      Valores herdados do shell (DATABASE_URL, NODE_ENV...) são descartados,
//      e o .env de desenvolvimento não consegue preenchê-los depois.
//   2) NODE_ENV precisa ser exatamente "test".
//   3) Host do banco precisa ser local (guard padrão, sem DB_ALLOWED_HOSTS).
//   4) Nome do banco precisa ser exatamente "loadesign_test".
//
// Mensagens nunca incluem usuário, senha ou query string.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
  assertSafeDatabaseEnv,
  parseDatabaseTarget,
  DatabaseGuardError,
} = require("../../src/config/dbGuard");

const BACKEND_DIR = path.resolve(__dirname, "..", "..");
const TEST_ENV_FILE = path.join(BACKEND_DIR, ".env.test");
const TEST_DB_NAME = "loadesign_test";

// Variáveis que definem "onde" e "como" os testes rodam. Só o .env.test manda.
const MANAGED_KEYS = ["NODE_ENV", "DATABASE_URL", "DIRECT_URL", "SHADOW_DATABASE_URL", "DB_ALLOWED_HOSTS"];

function fail(msg) {
  throw new DatabaseGuardError(`[TEST GUARD] ${msg}`);
}

/** Valida um objeto de ambiente para uso pelos testes. Função pura. */
function assertTestDatabaseEnv(env) {
  if (env.NODE_ENV !== "test") {
    fail(`NODE_ENV precisa ser "test" (atual: "${env.NODE_ENV || "(vazio)"}").`);
  }
  if (env.DB_ALLOWED_HOSTS) {
    fail("DB_ALLOWED_HOSTS não é permitido nos testes: apenas localhost/127.0.0.1/::1.");
  }
  // Guard padrão (host local, protocolo postgres, ?host=, DIRECT/SHADOW_URL).
  assertSafeDatabaseEnv({ ...env, DB_ALLOWED_HOSTS: "" }, { alwaysEnforce: true });

  const target = parseDatabaseTarget(env.DATABASE_URL);
  if (!target || target.database !== TEST_DB_NAME) {
    fail(
      `O banco dos testes precisa ser exatamente "${TEST_DB_NAME}" ` +
      `(atual: "${target && target.database ? target.database : "(desconhecido)"}"). ` +
      "Os testes apagam dados e nunca podem usar o banco de desenvolvimento."
    );
  }
  return target;
}

/**
 * Monta o ambiente dos testes a partir de .env.test, descartando as variáveis
 * gerenciadas herdadas de `base`. Não altera process.env.
 */
function loadTestEnv({ file = TEST_ENV_FILE, base = process.env } = {}) {
  if (!fs.existsSync(file)) {
    fail(`Arquivo ${path.basename(file)} não encontrado. Copie .env.test.example para .env.test.`);
  }
  const parsed = dotenv.parse(fs.readFileSync(file));
  const env = { ...base };
  // Chaves gerenciadas ficam definidas (mesmo vazias) para que o
  // dotenv.config() do src/config/env.js não as preencha com o .env de dev.
  for (const k of MANAGED_KEYS) env[k] = "";
  Object.assign(env, parsed);
  const target = assertTestDatabaseEnv(env);
  return { env, target };
}

/** Aplica o ambiente de testes ao processo atual (usado dentro dos testes). */
function applyTestEnv(opts) {
  const { env, target } = loadTestEnv(opts);
  for (const k of MANAGED_KEYS) process.env[k] = env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  return target;
}

module.exports = {
  TEST_DB_NAME,
  TEST_ENV_FILE,
  MANAGED_KEYS,
  assertTestDatabaseEnv,
  loadTestEnv,
  applyTestEnv,
};
