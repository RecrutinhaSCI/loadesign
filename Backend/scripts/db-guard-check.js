#!/usr/bin/env node
// scripts/db-guard-check.js
// ─────────────────────────────────────────────────────────────────────────────
// Verificação prévia para comandos de manutenção locais (Prisma CLI, seed).
// Usado pelos scripts npm `db:*` de desenvolvimento ANTES de chamar o Prisma.
//
// - Carrega o .env do diretório atual (mesmo arquivo que o Prisma CLI lê
//   ao rodar a partir de Backend/).
// - Aplica o guard SEMPRE (inclusive com NODE_ENV=production).
// - Não abre conexão com o banco; apenas valida a URL.
// - Nunca imprime usuário, senha ou query string.
//
// Uso manual:  node scripts/db-guard-check.js
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { assertSafeDatabaseEnv } = require("../src/config/dbGuard");

try {
  const { target } = assertSafeDatabaseEnv(process.env, { alwaysEnforce: true });
  console.log(`[DB GUARD] OK — destino local: ${target}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
