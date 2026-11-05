#!/usr/bin/env node
// scripts/prod-migrate.js
// ─────────────────────────────────────────────────────────────────────────────
// Execução CONTROLADA da migração de produção (Fase D1 do release 2.0).
//
//   node scripts/prod-migrate.js check                     → só leitura (pré-voo)
//   node scripts/prod-migrate.js resolve-baseline --execute → marca 0_baseline
//   node scripts/prod-migrate.js deploy --execute           → aplica a migração aditiva
//   node scripts/prod-migrate.js status                     → migrate status
//   node scripts/prod-migrate.js verify                     → só leitura (pós-voo)
//
// Credencial: Backend/.env.migrate (ignorado pelo Git), preenchido pela
// responsável técnica SOMENTE para a sessão de migração:
//   MIGRATE_DATABASE_URL=   (role dona do schema, endpoint DIRETO, sem "-pooler")
//   MIGRATE_CONFIRM_HOST=   (host exato do endpoint direto)
//   MIGRATE_EXPECTED_BRANCH=(ID do branch production)
// Nunca usa a credencial somente leitura (.env.inspect) nem outra credencial. URLs e senhas
// nunca são impressas. Toda saída de ferramenta é mascarada.
//
// Pontos de parada automáticos (qualquer um aborta antes de escrever):
//   destino/branch/usuário inesperados · endpoint pooler · usuário somente leitura
//   · sem permissão de criação · catálogo incompatível com o baseline
//   · produção diferente do backup verificado · estado de _prisma_migrations inesperado
//   · checksums dos arquivos de migration diferentes dos validados.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const { tableHashes } = require("./prod-backup");

const BACKEND = path.resolve(__dirname, "..");
const ENV_FILE = process.env.MIGRATE_ENV_FILE || path.join(BACKEND, ".env.migrate");
const DEFAULT_MANIFEST = path.join(BACKEND, "backups", "loadesign-pre-2-0.manifest.json");
// Override do manifesto existe só para ensaios locais; é recusado em host remoto.
const MANIFEST = process.env.MIGRATE_BACKUP_MANIFEST || DEFAULT_MANIFEST;
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const BASELINE = "0_baseline";
const COMMERCIAL = "20261105120000_fluxo_comercial_2_0";
const NEW_TABLES = ["commercial_contacts", "proposals", "work_projects", "recurring_agreements", "receivables", "calendar_events", "activity_logs"];
// SHA-256 validados (commit 2470f3c). Qualquer diferença aborta.
const VALIDATED = {
  "prisma/migrations/0_baseline/migration.sql": "1b0ed7219365d80a295c105b545cf3ec498e671e025e4c3866fc855d607b6799",
  "prisma/migrations/20261105120000_fluxo_comercial_2_0/migration.sql": "7be43b2b160b4c4eb737e4b0ad6efe67e9dd53bb88c76069d9aa1c3ab466b8d7",
  "prisma/migrations/migration_lock.toml": "d6bae7899f05da956e1070ba5703455503208ef79e161acb18c93bfe3c6cd236",
};

const mask = (s) => String(s ?? "").replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");
const log = (m) => console.log(`[MIGRATE] ${m}`);
const stop = (m) => { console.error(`[MIGRATE] ⛔ PARADA: ${m}`); process.exit(2); };
const execute = process.argv.includes("--execute");

function loadTarget() {
  if (!fs.existsSync(ENV_FILE)) stop(`${path.basename(ENV_FILE)} não encontrado — preencha a credencial de migração.`);
  const env = dotenv.parse(fs.readFileSync(ENV_FILE));
  let u;
  try { u = new URL(env.MIGRATE_DATABASE_URL); } catch { stop("MIGRATE_DATABASE_URL inválida."); }
  const host = u.hostname.toLowerCase();
  const user = decodeURIComponent(u.username);
  if (!env.MIGRATE_CONFIRM_HOST || env.MIGRATE_CONFIRM_HOST.trim().toLowerCase() !== host) stop("MIGRATE_CONFIRM_HOST não confere com o host da URL.");
  if (!env.MIGRATE_EXPECTED_BRANCH) stop("MIGRATE_EXPECTED_BRANCH não definido.");
  if (/-pooler\b/.test(host)) stop("endpoint POOLER não é permitido para migrations — use o endpoint direto.");
  if (user === readInspectUser()) stop("a credencial somente leitura de inspeção não pode executar migrations.");
  if (process.env.MIGRATE_BACKUP_MANIFEST && !LOCAL_HOSTS.includes(host)) stop("MIGRATE_BACKUP_MANIFEST só é aceito em ensaio local.");
  if (!u.password) stop("URL sem senha.");
  // Parâmetros: mantém SSL obrigatório; remove opções não suportadas pelo Prisma.
  u.searchParams.delete("channel_binding");
  // SSL obrigatório em qualquer host remoto (só o ensaio em localhost dispensa).
  if (!LOCAL_HOSTS.includes(host)) u.searchParams.set("sslmode", "require");
  if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
  // Variante SOMENTE LEITURA para check/verify/status: o PostgreSQL recusa
  // qualquer escrita na sessão inteira (inclusive do Prisma CLI).
  const ro = new URL(u.toString());
  ro.searchParams.set("options", "-c default_transaction_read_only=on");
  return { url: u.toString(), roUrl: ro.toString(), host, user, database: u.pathname.slice(1), branch: env.MIGRATE_EXPECTED_BRANCH.trim() };
}

/** Usuário da credencial somente leitura (.env.inspect), se existir localmente. */
function readInspectUser() {
  const f = path.join(BACKEND, ".env.inspect");
  if (!fs.existsSync(f)) return null;
  try { return decodeURIComponent(new URL(dotenv.parse(fs.readFileSync(f)).INSPECT_DATABASE_URL).username) || null; } catch { return null; }
}

function checkChecksums() {
  for (const [rel, expected] of Object.entries(VALIDATED)) {
    const got = crypto.createHash("sha256").update(fs.readFileSync(path.join(BACKEND, rel))).digest("hex");
    if (got !== expected) stop(`checksum alterado em ${rel}`);
  }
  log("checksums das migrations = validados (commit 2470f3c)");
}

function prisma(target, ...args) {
  const readOnly = args[0] === "migrate" && args[1] === "status";
  const r = spawnSync(process.execPath, [path.join(BACKEND, "scripts", "prisma-safe.js"), ...args], {
    cwd: BACKEND,
    env: {
      ...process.env,
      DATABASE_URL: readOnly ? target.roUrl : target.url,
      PRISMA_PROD_CONFIRM_HOST: target.host,
      // Marcador do status supervisionado: só é enviado para `migrate status`.
      PRISMA_SAFE_SUPERVISED_STATUS: readOnly ? "1" : "",
      PRISMA_SAFE_EXPECTED_DATABASE: readOnly ? target.database : "",
      DIRECT_URL: "", SHADOW_DATABASE_URL: "",
    },
    encoding: "utf8",
  });
  return { status: r.status, out: mask(`${r.stdout}\n${r.stderr}`).split("\n").filter((l) => l.trim() && !/^Environment variables loaded/.test(l)).join("\n") };
}

async function readState(target) {
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.roUrl } } });
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      const q = (s) => tx.$queryRawUnsafe(s);
      const [id] = await q(`SELECT current_user AS u, current_database() AS d, current_setting('neon.branch_id', true) AS branch,
        has_schema_privilege('public','CREATE') AS can_create, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS sup`);
      const tables = (await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`)).map((r) => r.table_name);
      const enums = (await q(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'`)).map((r) => r.typname);
      let migrations = null;
      if (tables.includes("_prisma_migrations")) {
        migrations = await q(`SELECT migration_name, (finished_at IS NOT NULL) AS finished, (rolled_back_at IS NOT NULL) AS rolled_back FROM "_prisma_migrations" ORDER BY started_at`);
      }
      const legacy = tables.filter((t) => !NEW_TABLES.includes(t) && t !== "_prisma_migrations");
      const hashes = await tableHashes(q, legacy);
      const newCounts = {};
      for (const t of NEW_TABLES.filter((x) => tables.includes(x))) newCounts[t] = (await q(`SELECT COUNT(*)::int AS n FROM public."${t}"`))[0].n;
      return { ...id, tables, enums, migrations, hashes, newCounts };
    }, { timeout: 120000 });
  } finally { await db.$disconnect(); }
}

function assertIdentity(target, s) {
  if (s.d !== target.database) stop(`banco conectado inesperado (${s.d}).`);
  if (s.branch !== target.branch) stop(`branch conectado (${s.branch}) diferente do esperado.`);
  if (!s.can_create) stop(`o usuário ${s.u} não tem permissão de criação no schema public.`);
  log(`conectado: ${target.host}/${s.d} · branch ${s.branch} · usuário ${s.u} · pode criar: sim`);
}

function assertLegacyEqualsBackup(s) {
  if (!fs.existsSync(MANIFEST)) stop("manifesto do backup verificado não encontrado.");
  const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const diff = Object.keys(m.tables).filter((t) => !s.hashes[t] || s.hashes[t].md5 !== m.tables[t].md5 || s.hashes[t].rows !== m.tables[t].rows);
  if (diff.length) stop(`dados legados diferentes do backup verificado em: ${diff.join(", ")} — refaça o backup antes de migrar.`);
  log(`dados legados idênticos ao backup verificado (${Object.keys(m.tables).length}/${Object.keys(m.tables).length} tabelas, snapshot ${m.snapshotAt})`);
}

function catalogCheck(target) {
  const r = spawnSync(process.execPath, [path.join(BACKEND, "scripts", "db-catalog-inspect.js"), "--reference", path.join(BACKEND, "prisma", "reference", "legacy-catalog.json")], {
    cwd: BACKEND, env: { ...process.env, INSPECT_DATABASE_URL: target.roUrl, INSPECT_CONFIRM_HOST: target.host }, encoding: "utf8",
  });
  const out = mask(`${r.stdout}${r.stderr}`);
  return { verdict: (out.match(/Veredito: (\S+)/) || [])[1] || "ERRO", out };
}

async function cmdCheck() {
  const target = loadTarget();
  checkChecksums();
  const s = await readState(target);
  assertIdentity(target, s);
  if (s.migrations !== null) stop(`_prisma_migrations já existe (${s.migrations.map((m) => m.migration_name).join(", ") || "vazia"}) — estado não previsto.`);
  if (NEW_TABLES.some((t) => s.tables.includes(t))) stop("tabelas do fluxo 2.0 já existem.");
  log("_prisma_migrations inexistente · nenhuma tabela nova presente");
  const c = catalogCheck(target);
  if (c.verdict !== "COMPATÍVEL") stop(`catálogo: ${c.verdict}\n${c.out}`);
  log("catálogo legado idêntico ao baseline: COMPATÍVEL");
  assertLegacyEqualsBackup(s);
  log("PRÉ-VOO APROVADO — nada foi gravado.");
}

async function cmdResolve() {
  if (!execute) stop("use --execute (requer autorização).");
  const target = loadTarget();
  checkChecksums();
  const s = await readState(target);
  assertIdentity(target, s);
  if (s.migrations !== null) stop("_prisma_migrations já existe — não marcar o baseline novamente.");
  if (NEW_TABLES.some((t) => s.tables.includes(t))) stop("tabelas do fluxo 2.0 já existem.");
  assertLegacyEqualsBackup(s);
  const r = prisma(target, "migrate", "resolve", "--applied", BASELINE);
  console.log(r.out);
  if (r.status !== 0) stop("migrate resolve falhou — nada além do registro do Prisma pode ter sido criado. Verifique com 'status'.");
  const after = await readState(target);
  const ok = after.migrations && after.migrations.length === 1 && after.migrations[0].migration_name === BASELINE && after.migrations[0].finished;
  if (!ok) stop(`estado inesperado após resolve: ${JSON.stringify(after.migrations)}`);
  assertLegacyEqualsBackup(after);
  log("0_baseline registrado como aplicado; dados legados inalterados.");
}

async function cmdDeploy() {
  if (!execute) stop("use --execute (requer autorização).");
  const target = loadTarget();
  checkChecksums();
  const s = await readState(target);
  assertIdentity(target, s);
  const okBefore = s.migrations && s.migrations.length === 1 && s.migrations[0].migration_name === BASELINE && s.migrations[0].finished && !s.migrations[0].rolled_back;
  if (!okBefore) stop(`pré-condição: somente 0_baseline concluído em _prisma_migrations. Atual: ${JSON.stringify(s.migrations)}`);
  if (NEW_TABLES.some((t) => s.tables.includes(t))) stop("tabelas do fluxo 2.0 já existem.");
  assertLegacyEqualsBackup(s);
  const r = prisma(target, "migrate", "deploy");
  console.log(r.out);
  if (r.status !== 0) {
    stop(`migrate deploy falhou. A migração é transacional (nada aplicado), mas o Prisma registra a tentativa.
  Não tente de novo. Diagnóstico: node scripts/prod-migrate.js verify ; depois, com autorização:
  migrate resolve --rolled-back ${COMMERCIAL}`);
  }
  await cmdVerify(true);
}

async function cmdVerify(afterDeploy = false) {
  const target = loadTarget();
  const s = await readState(target);
  assertIdentity(target, s);
  log(`_prisma_migrations: ${JSON.stringify(s.migrations)}`);
  const missing = NEW_TABLES.filter((t) => !s.tables.includes(t));
  log(`tabelas novas: ${missing.length ? "FALTAM " + missing.join(", ") : "7/7 presentes"} · contagens ${JSON.stringify(s.newCounts)}`);
  log(`tipos enum: ${s.enums.length}`);
  assertLegacyEqualsBackup(s);
  const st = prisma(target, "migrate", "status");
  console.log(st.out);
  if (afterDeploy) {
    const ok = !missing.length && s.enums.length === 10 && Object.values(s.newCounts).every((n) => n === 0) && st.status === 0 && /up to date/i.test(st.out)
      && s.migrations.length === 2 && s.migrations.every((m) => m.finished && !m.rolled_back);
    if (!ok) stop("critérios pós-migração não atendidos — não fazer merge.");
    log("MIGRAÇÃO APROVADA: 2 migrations concluídas, 7 tabelas e 10 tipos novos vazios, legado idêntico ao backup.");
  }
}

async function cmdStatus() {
  const target = loadTarget();
  // Identidade (banco, branch, permissão) confirmada por leitura antes do status.
  assertIdentity(target, await readState(target));
  const r = prisma(target, "migrate", "status");
  console.log(r.out);
  process.exit(r.status ?? 1);
}

const cmd = process.argv[2];
const map = { check: cmdCheck, "resolve-baseline": cmdResolve, deploy: cmdDeploy, status: cmdStatus, verify: () => cmdVerify(false) };
if (!map[cmd]) stop("uso: check | resolve-baseline --execute | deploy --execute | status | verify");
map[cmd]().catch((e) => stop(mask(e && e.message ? e.message : e)));
