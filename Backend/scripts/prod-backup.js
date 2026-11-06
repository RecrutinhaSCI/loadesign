#!/usr/bin/env node
// scripts/prod-backup.js
// ─────────────────────────────────────────────────────────────────────────────
// Backup verificável do banco de produção (Fase B do release 2.0).
//
//   node scripts/prod-backup.js plan                 → só verificações (padrão)
//   node scripts/prod-backup.js dump    --execute    → pg_dump + manifesto
//   node scripts/prod-backup.js restore --execute    → restauração local + comparação
//
// Origem: Backend/.env.inspect (usuário SOMENTE LEITURA). Se ele falhar, o script
// PARA — nunca tenta outra credencial.
//
// Consistência: o dump e os hashes de verificação usam o MESMO snapshot
// (transação REPEATABLE READ READ ONLY + pg_export_snapshot + pg_dump --snapshot).
// Alterações concorrentes em produção não afetam a comparação; o script também
// informa se a produção mudou desde o snapshot.
//
// Destino da restauração: banco local NOVO "loadesign_restore_check".
// Se já existir, o script recusa (nunca sobrescreve nada).
// Credenciais e URLs nunca são impressas; o pg_dump recebe a conexão por
// variáveis de ambiente (PGHOST/PGUSER/PGPASSWORD…), não por argumento.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const dotenv = require("dotenv");
const { DEFAULT_LOCAL_HOSTS } = require("../src/config/dbGuard");

const BACKEND = path.resolve(__dirname, "..");
const PG_BIN = process.env.PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const OUT_DIR = path.join(BACKEND, "backups");
const DUMP = path.join(OUT_DIR, "loadesign-pre-2-0.dump");
const MANIFEST = path.join(OUT_DIR, "loadesign-pre-2-0.manifest.json");
const RESTORE_DB = "loadesign_restore_check";
const PROTECTED_LOCAL_DBS = ["loadesign_dev", "loadesign_test", "postgres", "template0", "template1"];
const EXPECTED_TABLES = ["agency_settings", "clients", "contact_messages", "leads", "portfolio_items", "projects", "quotes", "services", "testimonials", "transactions", "users"];

const die = (m) => { console.error(`[BACKUP] ✖ ${m}`); process.exit(1); };
const log = (m) => console.log(`[BACKUP] ${m}`);
const mask = (s) => String(s).replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");
const bin = (name) => path.join(PG_BIN, process.platform === "win32" ? `${name}.exe` : name);
const execute = process.argv.includes("--execute");

function readSource() {
  const file = path.join(BACKEND, ".env.inspect");
  if (!fs.existsSync(file)) die(".env.inspect ausente.");
  const env = dotenv.parse(fs.readFileSync(file));
  let u;
  try { u = new URL(env.INSPECT_DATABASE_URL); } catch { die("INSPECT_DATABASE_URL inválida."); }
  const host = u.hostname.toLowerCase();
  if (String(env.INSPECT_CONFIRM_HOST || "").trim().toLowerCase() !== host) die("INSPECT_CONFIRM_HOST não confere com o host.");
  return {
    url: env.INSPECT_DATABASE_URL, host, database: u.pathname.slice(1), user: decodeURIComponent(u.username),
    pgEnv: { PGHOST: u.hostname, PGPORT: u.port || "5432", PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: u.pathname.slice(1), PGSSLMODE: u.searchParams.get("sslmode") || "require" },
  };
}

function readLocalAdmin() {
  const env = dotenv.parse(fs.readFileSync(path.join(BACKEND, ".env")));
  const u = new URL(env.DATABASE_URL);
  if (!DEFAULT_LOCAL_HOSTS.includes(u.hostname)) die("O .env local não aponta para localhost — abortado.");
  return { PGHOST: u.hostname, PGPORT: u.port || "5432", PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password) };
}

function client(url) {
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({ datasources: { db: { url } } });
}

/** Contagem + md5 determinístico por tabela (texto canônico: UTC, ISO, floats estáveis). */
async function tableHashes(q, tables) {
  await q("SET LOCAL TimeZone = 'UTC'");
  await q("SET LOCAL DateStyle = 'ISO, MDY'");
  await q("SET LOCAL extra_float_digits = 1");
  const out = {};
  for (const t of tables) {
    const [r] = await q(`SELECT COUNT(*)::int AS n, md5(COALESCE(string_agg(x::text, E'\\n' ORDER BY x::text), '')) AS h FROM public."${t}" x`);
    out[t] = { rows: r.n, md5: r.h };
  }
  return out;
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function runPg(tool, args, env) {
  return new Promise((resolve) => {
    const p = spawn(bin(tool), args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; let err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => resolve({ code, out, err: mask(err) }));
  });
}

function analyzeList(listing) {
  const lines = listing.split(/\r?\n/).filter((l) => l && !l.startsWith(";"));
  const of = (kind) => lines.filter((l) => new RegExp(`\\b${kind} public `).test(l)).map((l) => l.trim().split(/\s+/).slice(-2)[0]);
  return {
    tables: of("TABLE").sort(),
    tableData: of("TABLE DATA").sort(),
    constraints: lines.filter((l) => /\bCONSTRAINT\b|\bFK CONSTRAINT\b/.test(l)).length,
    indexes: lines.filter((l) => /\bINDEX public\b/.test(l)).length,
    schemaEntry: lines.find((l) => /\bSCHEMA - public\b/.test(l)) || null,
    total: lines.length,
  };
}

// ─── plan ────────────────────────────────────────────────────────────────────
async function plan() {
  for (const t of ["pg_dump", "pg_restore", "createdb"]) {
    const r = spawnSync(bin(t), ["--version"], { encoding: "utf8" });
    if (r.status !== 0) die(`${t} não encontrado em ${PG_BIN}`);
    log(`${t}: ${r.stdout.trim()}`);
  }
  const src = readSource();
  log(`origem: ${src.host}/${src.database} · usuário ${src.user}`);
  const db = client(src.url);
  try {
    const info = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      const q = (s) => tx.$queryRawUnsafe(s);
      const [i] = await q(`SELECT current_user AS u, current_setting('server_version_num')::int AS v, current_setting('neon.branch_id', true) AS branch,
        (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS sup,
        has_schema_privilege('public','CREATE') AS can_create, has_database_privilege(current_database(),'CREATE') AS db_create`);
      const priv = await q(`SELECT c.relname AS t, has_table_privilege(c.oid,'SELECT') AS sel,
        (has_table_privilege(c.oid,'INSERT') OR has_table_privilege(c.oid,'UPDATE') OR has_table_privilege(c.oid,'DELETE') OR has_table_privilege(c.oid,'TRUNCATE')) AS w
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S')`);
      const [s] = await q("SELECT pg_export_snapshot() IS NOT NULL AS ok");
      return { ...i, priv, snapshot: s.ok };
    }, { timeout: 30000 });
    if (info.sup || info.can_create || info.db_create || info.priv.some((p) => p.w)) die("o usuário de origem tem privilégios de escrita — abortado.");
    if (info.priv.some((p) => !p.sel)) die(`sem SELECT em: ${info.priv.filter((p) => !p.sel).map((p) => p.t).join(", ")}`);
    log(`usuário ${info.u}: somente leitura confirmado; SELECT em ${info.priv.length} objeto(s); snapshot exportável: ${info.snapshot}`);
    log(`branch Neon: ${info.branch}; servidor ${Math.floor(info.v / 10000)} · pg_dump local compatível`);
  } finally { await db.$disconnect(); }

  const admin = readLocalAdmin();
  const r = spawnSync(bin("psql"), ["-d", "postgres", "-Atc", `SELECT 1 FROM pg_database WHERE datname='${RESTORE_DB}'`], { env: { ...process.env, ...admin }, encoding: "utf8" });
  if (r.status !== 0) die(`não foi possível consultar o PostgreSQL local: ${mask(r.stderr).trim()}`);
  log(r.stdout.trim() === "1" ? `⚠ banco local ${RESTORE_DB} JÁ EXISTE — a restauração será recusada` : `banco local ${RESTORE_DB}: não existe (ok)`);
  log(fs.existsSync(DUMP) ? `⚠ ${path.relative(BACKEND, DUMP)} já existe — o dump será recusado` : `arquivo de dump: livre (${path.relative(BACKEND, DUMP)})`);
  log("PLANO OK — nada foi gravado.");
}

// ─── dump ────────────────────────────────────────────────────────────────────
async function dump() {
  if (!execute) die("use --execute para gerar o dump (requer autorização).");
  if (fs.existsSync(DUMP) || fs.existsSync(MANIFEST)) die("dump/manifesto já existem — não serão sobrescritos.");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const src = readSource();
  const db = client(src.url);
  const startedAt = new Date();
  log(`origem ${src.host}/${src.database} · usuário ${src.user} · início ${startedAt.toISOString()}`);
  try {
    const manifest = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      const q = (s) => tx.$queryRawUnsafe(s);
      const [snap] = await q(`SELECT pg_export_snapshot() AS id, current_setting('neon.branch_id', true) AS branch,
        current_setting('server_version') AS version, now() AS snapshot_at`);
      const expectedBranch = process.env.BACKUP_EXPECTED_BRANCH;
      if (expectedBranch && snap.branch !== expectedBranch) {
        throw new Error(`branch de origem inesperado (${snap.branch}); esperado ${expectedBranch} — abortado antes do dump`);
      }
      const tables = (await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`)).map((r) => r.table_name);

      log(`snapshot exportado · pg_dump em andamento…`);
      const r = await runPg("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--schema=public", `--snapshot=${snap.id}`, `--file=${DUMP}`], src.pgEnv);
      if (r.code !== 0) throw new Error(`pg_dump falhou: ${r.err.trim().split("\n").slice(-3).join(" ")}`);

      const hashes = await tableHashes(q, tables);
      return { snapshotAt: snap.snapshot_at, branch: snap.branch, version: snap.version, tables, hashes };
    }, { timeout: 300000, maxWait: 20000 });

    const list = await runPg("pg_restore", ["--list", DUMP], {});
    if (list.code !== 0) throw new Error(`pg_restore --list falhou: ${list.err}`);
    const analysis = analyzeList(list.out);
    const missing = EXPECTED_TABLES.filter((t) => !analysis.tables.includes(t) || !analysis.tableData.includes(t));
    const doc = {
      kind: "loadesign-pre-release-2.0",
      source: { host: src.host, database: src.database, user: src.user, neonBranchId: manifest.branch, serverVersion: manifest.version },
      snapshotAt: new Date(manifest.snapshotAt).toISOString(),
      snapshotAtBRT: new Date(manifest.snapshotAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      finishedAt: new Date().toISOString(),
      file: path.basename(DUMP), bytes: fs.statSync(DUMP).size, sha256: sha256(DUMP),
      list: analysis, missingTables: missing, tables: manifest.hashes,
    };
    fs.writeFileSync(MANIFEST, JSON.stringify(doc, null, 2));
    log(`dump: ${doc.bytes} bytes · SHA-256 ${doc.sha256}`);
    log(`pg_restore --list: ${analysis.tables.length} TABLE · ${analysis.tableData.length} TABLE DATA · ${analysis.constraints} constraint(s) · ${analysis.indexes} índice(s)`);
    for (const [t, h] of Object.entries(doc.tables)) log(`  ${t}: ${h.rows} linha(s) · md5 ${h.md5}`);
    if (missing.length) die(`tabelas ausentes no dump: ${missing.join(", ")}`);
    log(`manifesto: ${path.relative(BACKEND, MANIFEST)} · DUMP OK`);
  } catch (e) {
    die(mask(e.message));
  } finally { await db.$disconnect(); }
}

// ─── restore ─────────────────────────────────────────────────────────────────
async function restore() {
  if (!execute) die("use --execute para restaurar (requer autorização).");
  if (!fs.existsSync(DUMP) || !fs.existsSync(MANIFEST)) die("dump/manifesto não encontrados.");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (sha256(DUMP) !== manifest.sha256) die("SHA-256 do dump não confere com o manifesto — arquivo alterado.");
  log("SHA-256 confere com o manifesto");
  if (PROTECTED_LOCAL_DBS.includes(RESTORE_DB)) die("destino protegido.");
  const admin = readLocalAdmin();

  const exists = spawnSync(bin("psql"), ["-d", "postgres", "-Atc", `SELECT 1 FROM pg_database WHERE datname='${RESTORE_DB}'`], { env: { ...process.env, ...admin }, encoding: "utf8" });
  if (exists.stdout.trim() === "1") die(`${RESTORE_DB} já existe — nada será sobrescrito.`);
  let r = await runPg("createdb", [RESTORE_DB], admin);
  if (r.code !== 0) die(`createdb falhou: ${r.err}`);
  log(`banco local ${RESTORE_DB} criado`);

  // Remove do índice a entrada "SCHEMA public" (já existe no banco novo).
  const list = await runPg("pg_restore", ["--list", DUMP], {});
  const useList = path.join(OUT_DIR, "restore.list");
  fs.writeFileSync(useList, list.out.split(/\r?\n/).filter((l) => !/\bSCHEMA - public\b/.test(l)).join("\n"));
  r = await runPg("pg_restore", ["--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction", `--use-list=${useList}`, "-d", RESTORE_DB, DUMP], admin);
  fs.unlinkSync(useList);
  if (r.code !== 0) die(`pg_restore falhou (transação única: nada restaurado parcialmente): ${r.err.trim().split("\n").slice(-3).join(" ")}`);
  log("pg_restore concluído");

  // Mesma conexão local do .env, trocando apenas o banco (host já validado como local).
  const local = new URL(dotenv.parse(fs.readFileSync(path.join(BACKEND, ".env"))).DATABASE_URL);
  local.pathname = `/${RESTORE_DB}`;
  local.search = "";
  const localUrl = local.toString();
  const db = client(localUrl);
  try {
    const restored = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return tableHashes((s) => tx.$queryRawUnsafe(s), Object.keys(manifest.tables));
    }, { timeout: 120000 });
    let ok = true;
    for (const [t, h] of Object.entries(manifest.tables)) {
      const same = restored[t] && restored[t].rows === h.rows && restored[t].md5 === h.md5;
      ok = ok && same;
      log(`  ${same ? "✔" : "✖"} ${t}: origem ${h.rows}/${h.md5.slice(0, 12)} · cópia ${restored[t]?.rows}/${restored[t]?.md5.slice(0, 12)}`);
    }
    if (!ok) die("divergência entre o snapshot e a cópia restaurada — backup NÃO verificado.");
    log("cópia restaurada idêntica ao snapshot (contagem + md5 em todas as tabelas)");
  } finally { await db.$disconnect(); }

  // Informativo: a produção mudou desde o snapshot?
  const src = readSource();
  const prod = client(src.url);
  try {
    const now = await prod.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      return tableHashes((s) => tx.$queryRawUnsafe(s), Object.keys(manifest.tables));
    }, { timeout: 120000 });
    const changed = Object.keys(manifest.tables).filter((t) => now[t].md5 !== manifest.tables[t].md5);
    log(changed.length ? `ℹ produção mudou desde o snapshot em: ${changed.join(", ")} (esperado se houve uso; o backup continua válido para o instante do snapshot)` : "ℹ produção sem alterações desde o snapshot");
  } finally { await prod.$disconnect(); }
  log("BACKUP VERIFICADO");
}

if (require.main === module) {
  const cmd = process.argv[2] || "plan";
  ({ plan, dump, restore }[cmd] || (() => die("uso: plan | dump --execute | restore --execute")))().catch((e) => die(mask(e.message)));
}

module.exports = { analyzeList, tableHashes, runPg, sha256, EXPECTED_TABLES };
