#!/usr/bin/env node
// scripts/test-env-run.js
// ─────────────────────────────────────────────────────────────────────────────
// Executor do ambiente de TESTES. Carrega SOMENTE Backend/.env.test, valida
// (NODE_ENV=test, host local, banco exatamente "loadesign_test") e só então
// executa a ação pedida, com esse ambiente.
//
//   node scripts/test-env-run.js check   → valida config + porta do PostgreSQL
//   node scripts/test-env-run.js push    → schema no banco de testes (db push
//                                           via prisma-safe, sem flags de perda)
//   node scripts/test-env-run.js test    → testes de integração (node:test)
//
// Falha de forma segura (exit 1) em qualquer configuração incorreta.
// ─────────────────────────────────────────────────────────────────────────────

const net = require("net");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadTestEnv } = require("../tests/support/testEnv");

const BACKEND_DIR = path.resolve(__dirname, "..");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function probe(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

function run(args, env) {
  const r = spawnSync(process.execPath, args, { cwd: BACKEND_DIR, stdio: "inherit", env });
  process.exit(r.status ?? 1);
}

async function main() {
  const action = process.argv[2];
  if (!["check", "push", "test"].includes(action)) {
    die("Uso: node scripts/test-env-run.js <check|push|test>");
  }

  let loaded;
  try {
    loaded = loadTestEnv();
  } catch (err) {
    die(err.message);
  }
  const { env, target } = loaded;
  console.log(`[TEST GUARD] OK — destino: ${target.description}`);

  const host = target.host === "::1" ? "::1" : target.host;
  const port = Number(target.port || 5432);
  if (!(await probe(host, port))) {
    die(
      `[TEST GUARD] PostgreSQL local não responde em ${host}:${port}. ` +
      "Suba o container com `docker compose up -d` (em Backend/) e aguarde o status healthy."
    );
  }

  if (action === "check") return;
  if (action === "push") {
    return run([path.join("scripts", "prisma-safe.js"), "db", "push", "--skip-generate"], env);
  }
  return run(["--test", "--test-concurrency=1", "tests/integration/**/*.test.js"], env);
}

main();
