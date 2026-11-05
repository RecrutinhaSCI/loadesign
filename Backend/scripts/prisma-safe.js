#!/usr/bin/env node
// scripts/prisma-safe.js
// ─────────────────────────────────────────────────────────────────────────────
// Executor protegido do Prisma CLI. Todos os scripts npm `db:*` que tocam o
// banco passam por aqui. Classifica cada comando numa política:
//
//   offline     → não conecta no banco (generate, validate, format, version).
//                 Executa sem checagem de destino.
//   local       → conecta e pode alterar/apagar dados (migrate dev/reset,
//                 db push/pull/execute/seed, studio, migrate status/diff).
//                 Exige DATABASE_URL local/aprovada — SEMPRE, mesmo com
//                 NODE_ENV=production.
//   production  → migrate deploy / migrate resolve. Exige:
//                   1) PRISMA_PROD_CONFIRM_HOST igual ao host de DATABASE_URL;
//                   2) migration_lock.toml com o mesmo provider do schema
//                      (hoje: sqlite × postgresql → BLOQUEADO até o baseline).
//
// Comandos desconhecidos são recusados. Flags que apontam para outro banco
// (--url, --from-url, --to-url, --shadow-database-url) e flags que descartam
// dados (--accept-data-loss, --force-reset) são sempre recusadas.
//
// O executor NUNCA imprime credenciais e não usa `npx` (que poderia baixar
// pacotes da rede): usa o Prisma CLI instalado em node_modules.
//
// LIMITE: `npx prisma ...` digitado diretamente continua fora desta proteção.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const { assertSafeDatabaseEnv, parseDatabaseTarget } = require("../src/config/dbGuard");

const BACKEND_DIR = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(BACKEND_DIR, "prisma", "schema.prisma");
const LOCK_PATH = path.join(BACKEND_DIR, "prisma", "migrations", "migration_lock.toml");

const POLICIES = {
  "generate": "offline",
  "validate": "offline",
  "format": "offline",
  "version": "offline",

  "migrate dev": "local",
  "migrate reset": "local",
  "migrate status": "local",
  "migrate diff": "local",
  "db push": "local",
  "db pull": "local",
  "db execute": "local",
  "db seed": "local",
  "studio": "local",

  "migrate deploy": "production",
  "migrate resolve": "production",
};

const FORBIDDEN_FLAGS = ["--url", "--from-url", "--to-url", "--shadow-database-url"];
// Flags que descartam dados/tabelas sem confirmação. Recusadas em qualquer
// destino: para recomeçar do zero, remova o volume local do Docker.
const DATA_LOSS_FLAGS = ["--accept-data-loss", "--force-reset"];

function commandKey(args) {
  const positional = args.filter((a) => !a.startsWith("-"));
  const two = positional.slice(0, 2).join(" ");
  if (POLICIES[two]) return two;
  return positional[0] || "";
}

function readProvider(text, blockRegex) {
  if (!text) return null;
  const block = blockRegex ? (text.match(blockRegex) || [])[0] || "" : text;
  const m = block.match(/provider\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function readProviders(fsImpl = fs) {
  const read = (p) => (fsImpl.existsSync(p) ? fsImpl.readFileSync(p, "utf8") : null);
  return {
    schemaProvider: readProvider(read(SCHEMA_PATH), /datasource\s+\w+\s*\{[^}]*\}/),
    lockProvider: readProvider(read(LOCK_PATH)),
  };
}

/**
 * Decide se o comando pode rodar. Função pura (sem I/O) para ser testável.
 * @returns {{ allowed: boolean, policy: string|null, reason: string }}
 */
function decide(args, env, { schemaProvider, lockProvider }) {
  const key = commandKey(args);
  const policy = POLICIES[key] || null;

  if (!policy) {
    return { allowed: false, policy, reason: `Comando Prisma não permitido pelo executor seguro: "${key || "(vazio)"}".` };
  }

  const badFlag = args.find((a) => FORBIDDEN_FLAGS.some((f) => a === f || a.startsWith(`${f}=`)));
  if (badFlag) {
    return { allowed: false, policy, reason: `Flag não permitida (aponta para outro banco): ${badFlag.split("=")[0]}` };
  }

  const lossFlag = args.find((a) => DATA_LOSS_FLAGS.includes(a.split("=")[0]));
  if (lossFlag) {
    return { allowed: false, policy, reason: `Flag não permitida (descarta dados): ${lossFlag.split("=")[0]}` };
  }

  if (policy === "offline") {
    return { allowed: true, policy, reason: "Comando offline (não conecta no banco)." };
  }

  if (policy === "local") {
    // Exceção ÚNICA e estreita: `migrate status` remoto, somente quando invocado
    // pelo fluxo supervisionado (scripts/prod-migrate.js), que já validou
    // projeto/branch/banco/usuário por consulta somente leitura imediatamente antes.
    if (key === "migrate status" && env.PRISMA_SAFE_SUPERVISED_STATUS === "1") {
      return decideSupervisedStatus(args, env, { schemaProvider, lockProvider });
    }
    try {
      const { target } = assertSafeDatabaseEnv(env, { alwaysEnforce: true });
      return { allowed: true, policy, reason: `Destino local: ${target}` };
    } catch (err) {
      return { allowed: false, policy, reason: err.message };
    }
  }

  // production
  const target = parseDatabaseTarget(env.DATABASE_URL);
  if (!target || !target.host) {
    return { allowed: false, policy, reason: "DATABASE_URL ausente ou inválida." };
  }
  if (!schemaProvider || !lockProvider || schemaProvider !== lockProvider) {
    return {
      allowed: false,
      policy,
      reason:
        `migration_lock.toml (provider "${lockProvider}") não corresponde ao schema (provider "${schemaProvider}"). ` +
        "As migrations atuais não podem ser aplicadas. Baseline PostgreSQL pendente (Etapa 2.3).",
    };
  }
  const confirm = String(env.PRISMA_PROD_CONFIRM_HOST || "").trim().toLowerCase();
  if (!confirm || confirm !== target.host) {
    return {
      allowed: false,
      policy,
      reason:
        `Operação de produção exige PRISMA_PROD_CONFIRM_HOST igual ao host de destino (${target.host}). ` +
        "Defina-a apenas na sessão do comando, com autorização explícita.",
    };
  }
  return { allowed: true, policy, reason: `Produção confirmada para ${target.description}` };
}

/**
 * `migrate status` remoto sob supervisão. Todas as condições são obrigatórias:
 *  - argumentos exatamente ["migrate", "status"] (nada além);
 *  - PRISMA_PROD_CONFIRM_HOST igual ao host; PRISMA_SAFE_EXPECTED_DATABASE igual ao banco;
 *  - endpoint direto (sem "-pooler"); sslmode=require/verify-ca/verify-full;
 *  - sessão forçada somente leitura: options contém default_transaction_read_only=on
 *    (o PostgreSQL recusa qualquer DDL/DML nessa sessão);
 *  - migration_lock.toml com o mesmo provider do schema.
 */
function decideSupervisedStatus(args, env, { schemaProvider, lockProvider }) {
  const policy = "supervised-readonly";
  const no = (reason) => ({ allowed: false, policy, reason });
  if (args.length !== 2 || args[0] !== "migrate" || args[1] !== "status") return no("status supervisionado não aceita argumentos adicionais.");
  let url;
  try { url = new URL(String(env.DATABASE_URL || "")); } catch { return no("DATABASE_URL ausente ou inválida."); }
  const target = parseDatabaseTarget(env.DATABASE_URL);
  if (!target || !target.host) return no("DATABASE_URL ausente ou inválida.");
  const confirm = String(env.PRISMA_PROD_CONFIRM_HOST || "").trim().toLowerCase();
  if (!confirm || confirm !== target.host) return no(`PRISMA_PROD_CONFIRM_HOST precisa ser igual ao host (${target.host}).`);
  const expectedDb = String(env.PRISMA_SAFE_EXPECTED_DATABASE || "").trim();
  if (!expectedDb || expectedDb !== target.database) return no("PRISMA_SAFE_EXPECTED_DATABASE ausente ou diferente do banco da URL.");
  if (/-pooler\b/.test(target.host)) return no("endpoint pooler não é permitido.");
  const local = ["localhost", "127.0.0.1", "::1"].includes(target.host);
  if (!local && !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode"))) return no("SSL obrigatório (sslmode=require).");
  const options = String(url.searchParams.get("options") || "").replace(/\s+/g, " ");
  if (!/(^|\s)-c default_transaction_read_only=on(\s|$)/.test(options)) return no("sessão precisa ser somente leitura (options=-c default_transaction_read_only=on).");
  if (!schemaProvider || !lockProvider || schemaProvider !== lockProvider) return no("migration_lock.toml incompatível com o schema.");
  return { allowed: true, policy, reason: `Status somente leitura supervisionado: ${target.description}` };
}

function resolvePrismaCli() {
  try {
    return require.resolve("prisma/build/index.js", { paths: [BACKEND_DIR] });
  } catch {
    return null;
  }
}

function main(argv) {
  require("dotenv").config({ path: path.join(BACKEND_DIR, ".env") });

  const args = argv.slice(2);
  const decision = decide(args, process.env, readProviders());

  if (!decision.allowed) {
    console.error(`[PRISMA SAFE] BLOQUEADO — ${decision.reason}`);
    process.exit(1);
  }
  console.log(`[PRISMA SAFE] ${decision.policy}: ${decision.reason}`);

  const cli = resolvePrismaCli();
  if (!cli) {
    console.error("[PRISMA SAFE] Prisma CLI não encontrado em node_modules. Rode a instalação de dependências (etapa autorizada).");
    process.exit(1);
  }

  const { spawnSync } = require("child_process");
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: BACKEND_DIR,
    stdio: "inherit",
    // Sem verificação de versão/telemetria do Prisma (checkpoint.prisma.io).
    env: { ...process.env, CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
  process.exit(result.status ?? 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { decide, commandKey, readProvider, readProviders, POLICIES, FORBIDDEN_FLAGS, DATA_LOSS_FLAGS };
