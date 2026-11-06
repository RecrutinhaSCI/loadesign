#!/usr/bin/env node
// scripts/db-local-inspect.js
// ─────────────────────────────────────────────────────────────────────────────
// Inspeção SOMENTE LEITURA de um banco local, antes de aplicar o schema.
//
//   node scripts/db-local-inspect.js dev    → usa .env       (loadesign_dev)
//   node scripts/db-local-inspect.js test   → usa .env.test  (loadesign_test)
//
// Mostra: destino (sem credenciais), versão do servidor, banco conectado,
// tabelas existentes no schema public e quantidade de linhas de cada uma.
// Não escreve nada. Recusa hosts não locais (guard sempre aplicado).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { assertSafeDatabaseEnv } = require("../src/config/dbGuard");

const BACKEND_DIR = path.resolve(__dirname, "..");
const TARGETS = {
  dev: { file: ".env", db: "loadesign_dev" },
  test: { file: ".env.test", db: "loadesign_test" },
};

async function main() {
  const which = process.argv[2];
  const cfg = TARGETS[which];
  if (!cfg) throw new Error("Uso: node scripts/db-local-inspect.js <dev|test>");

  const file = path.join(BACKEND_DIR, cfg.file);
  if (!fs.existsSync(file)) throw new Error(`${cfg.file} não encontrado.`);
  const env = dotenv.parse(fs.readFileSync(file));
  if (/COLOQUE_A_SENHA_AQUI/.test(env.DATABASE_URL || "")) {
    throw new Error(`Defina a senha local em ${cfg.file} (substitua COLOQUE_A_SENHA_AQUI).`);
  }

  const { target } = assertSafeDatabaseEnv({ ...env, DB_ALLOWED_HOSTS: "" }, { alwaysEnforce: true });
  if (!target.endsWith(`/${cfg.db}`)) throw new Error(`Esperado banco ${cfg.db}, configurado: ${target}`);
  console.log(`[INSPECT] Destino: ${target}`);

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    const [{ db, version }] = await prisma.$queryRawUnsafe(
      "SELECT current_database() AS db, current_setting('server_version') AS version"
    );
    if (db !== cfg.db) throw new Error(`Conectado em "${db}", esperado "${cfg.db}". Abortado.`);
    console.log(`[INSPECT] Conectado em ${db} — PostgreSQL ${version}`);

    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1"
    );
    if (!tables.length) {
      console.log("[INSPECT] Schema public vazio — nenhuma tabela, nenhum dado a preservar.");
      return;
    }
    let total = 0;
    for (const { table_name } of tables) {
      const [{ n }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "public"."${table_name.replace(/"/g, '""')}"`);
      total += n;
      console.log(`[INSPECT]   ${table_name}: ${n} linha(s)`);
    }
    console.log(`[INSPECT] ${tables.length} tabela(s), ${total} linha(s) no total.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // Mensagens do Prisma podem conter a URL: mostramos apenas a primeira linha útil, sem credenciais.
  const msg = String((err && err.message) || err).replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");
  console.error(`[INSPECT] Falhou: ${msg.split("\n").filter(Boolean).slice(-1)[0]}`);
  process.exit(1);
});
