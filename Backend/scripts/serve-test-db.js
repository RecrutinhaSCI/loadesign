#!/usr/bin/env node
// scripts/serve-test-db.js
// ─────────────────────────────────────────────────────────────────────────────
// Sobe a API LOCAL apontando para o banco de TESTES ("loadesign_test"), para
// homologação visual do painel sem gravar dados de teste no banco de
// desenvolvimento. Usa o mesmo guard dos testes automatizados (somente
// .env.test, host local, banco exatamente loadesign_test).
//
//   node scripts/serve-test-db.js        → http://localhost:3333 (proxy do admin)
//
// Atenção: `npm run test:integration` limpa este banco ao rodar.
// ─────────────────────────────────────────────────────────────────────────────

const { applyTestEnv } = require("../tests/support/testEnv");

const target = applyTestEnv();
process.env.PORT = process.env.SERVE_PORT || "3333";

const app = require("../src/server");
const prisma = require("../src/config/prisma");

prisma.$connect().then(() => {
  app.listen(Number(process.env.PORT), () => {
    console.log(`[SERVE TEST DB] API em http://localhost:${process.env.PORT} — banco ${target.description}`);
  });
}).catch((err) => {
  console.error("[SERVE TEST DB] Falha ao conectar:", err.message);
  process.exit(1);
});
