#!/usr/bin/env node
// scripts/db-catalog-inspect.js
// ─────────────────────────────────────────────────────────────────────────────
// Inspeção ESTRITAMENTE SOMENTE LEITURA do catálogo de um banco PostgreSQL,
// para verificar a compatibilidade do Neon com a migração do Fluxo 2.0.
//
// Garantias:
//   - Todas as consultas rodam dentro de UMA transação `READ ONLY`
//     (o PostgreSQL rejeita qualquer escrita).
//   - Lê apenas metadados (tabelas, colunas, índices, constraints, enums,
//     _prisma_migrations) e contagens. Nenhum dado pessoal é lido ou exibido,
//     exceto a distribuição de papéis/ativos da tabela users (só contagens).
//   - Host externo exige INSPECT_CONFIRM_HOST igual ao host da URL.
//   - Credenciais nunca são impressas.
//
// Uso:
//   INSPECT_DATABASE_URL="postgresql://..." INSPECT_CONFIRM_HOST="<host>" \
//     node scripts/db-catalog-inspect.js --out relatorio.json
//   (sem INSPECT_DATABASE_URL, usa DATABASE_URL do .env — somente local)
//
//   --reference prisma/reference/legacy-catalog.json  → compara com o esperado
//   --write-reference                                → grava o catálogo como referência
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
// Credencial de inspeção: variáveis do terminal ou Backend/.env.inspect
// (arquivo local, ignorado pelo Git). Nunca reutilize a URL de escrita.
require("dotenv").config({ path: path.join(__dirname, "..", ".env.inspect") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { parseDatabaseTarget, DEFAULT_LOCAL_HOSTS } = require("../src/config/dbGuard");

const NEW_TABLES = ["commercial_contacts", "proposals", "work_projects", "recurring_agreements", "receivables", "calendar_events", "activity_logs"];
const NEW_ENUMS = ["ContactType", "ProposalStatus", "WorkProjectStatus", "PaymentMode", "ReceivableKind", "ReceivableStatus", "PaymentMethod", "RecurringStatus", "CalendarEventType", "CalendarEventStatus"];
const LEGACY_TABLES = ["users", "leads", "clients", "projects", "services", "quotes", "transactions", "agency_settings", "testimonials", "portfolio_items", "contact_messages"];

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const has = (name) => process.argv.includes(name);
const die = (m) => { console.error(`[CATALOG] ${m}`); process.exit(1); };
const mask = (s) => String(s).replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");

async function inspect(db, schema) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const q = (sql, ...p) => tx.$queryRawUnsafe(sql, ...p);
    const [{ ro }] = await q("SELECT current_setting('transaction_read_only') AS ro");
    if (ro !== "on") throw new Error("transação não ficou READ ONLY — abortado");
    const [info] = await q("SELECT current_database() AS database, current_setting('server_version') AS version");

    const tables = (await q(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE' ORDER BY 1`, schema)).map((r) => r.table_name);
    const columns = await q(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema=$1 ORDER BY table_name, ordinal_position`, schema);
    const indexes = await q(`SELECT tablename AS table_name, indexname, replace(indexdef, $1 || '.', '') AS indexdef FROM pg_indexes WHERE schemaname=$1 ORDER BY 1, 2`, schema);
    const constraints = await q(`SELECT rel.relname AS table_name, c.conname, c.contype::text AS contype, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c JOIN pg_class rel ON rel.oid=c.conrelid JOIN pg_namespace n ON n.oid=rel.relnamespace
      WHERE n.nspname=$1 ORDER BY 1, 2`, schema);
    const enums = await q(`SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname=$1 GROUP BY t.typname ORDER BY 1`, schema);

    let migrations = null;
    if (tables.includes("_prisma_migrations")) {
      migrations = await q(`SELECT migration_name, (finished_at IS NOT NULL) AS finished, (rolled_back_at IS NOT NULL) AS rolled_back, applied_steps_count
        FROM "${schema}"."_prisma_migrations" ORDER BY started_at`);
    }
    const rowCounts = {};
    for (const t of tables) {
      const [{ n }] = await q(`SELECT COUNT(*)::int AS n FROM "${schema}"."${t.replace(/"/g, '""')}"`);
      rowCounts[t] = n;
    }
    let userRoles = null;
    if (tables.includes("users")) {
      userRoles = await q(`SELECT role, active, COUNT(*)::int AS n FROM "${schema}"."users" GROUP BY role, active ORDER BY role, active`);
    }
    return { ...info, schema, tables, columns, indexes, constraints, enums, migrations, rowCounts, userRoles };
  }, { timeout: 60_000 });
}

function compare(actual, reference) {
  const issues = [];
  const cols = (cat, t) => Object.fromEntries(cat.columns.filter((c) => c.table_name === t)
    .map((c) => [c.column_name, `${c.udt_name}|${c.is_nullable}|${c.column_default ?? ""}`]));
  for (const t of LEGACY_TABLES) {
    if (!actual.tables.includes(t)) { issues.push({ severity: "BLOCKER", item: `tabela legada ausente: ${t}` }); continue; }
    const a = cols(actual, t); const r = cols(reference, t);
    for (const [c, def] of Object.entries(r)) {
      if (!(c in a)) issues.push({ severity: "BLOCKER", item: `${t}.${c} ausente no banco` });
      else if (a[c] !== def) issues.push({ severity: "REVIEW", item: `${t}.${c} difere`, expected: def, actual: a[c] });
    }
    for (const c of Object.keys(a)) if (!(c in r)) issues.push({ severity: "REVIEW", item: `${t}.${c} existe no banco e não no schema` });
    const idx = (cat) => new Set(cat.indexes.filter((i) => i.table_name === t).map((i) => i.indexdef));
    const ai = idx(actual); const ri = idx(reference);
    for (const d of ri) if (!ai.has(d)) issues.push({ severity: "REVIEW", item: `índice esperado ausente/diferente em ${t}`, expected: d });
    for (const d of ai) if (!ri.has(d)) issues.push({ severity: "INFO", item: `índice extra em ${t}`, actual: d });
    const con = (cat) => new Set(cat.constraints.filter((c) => c.table_name === t).map((c) => `${c.contype}:${c.def}`));
    const ac = con(actual); const rc = con(reference);
    for (const d of rc) if (!ac.has(d)) issues.push({ severity: "REVIEW", item: `constraint esperada ausente/diferente em ${t}`, expected: d });
    for (const d of ac) if (!rc.has(d)) issues.push({ severity: "INFO", item: `constraint extra em ${t}`, actual: d });
  }
  for (const t of actual.tables) {
    if (NEW_TABLES.includes(t)) issues.push({ severity: "BLOCKER", item: `colisão: tabela "${t}" já existe` });
    else if (!LEGACY_TABLES.includes(t) && t !== "_prisma_migrations") issues.push({ severity: "REVIEW", item: `tabela não prevista no schema: ${t} (${actual.rowCounts[t]} linha(s)) — preservada, não será tocada` });
  }
  for (const e of actual.enums) if (NEW_ENUMS.includes(e.typname)) issues.push({ severity: "BLOCKER", item: `colisão: tipo enum "${e.typname}" já existe` });
  if (actual.migrations) {
    const names = actual.migrations.map((m) => m.migration_name);
    const failed = actual.migrations.filter((m) => !m.finished || m.rolled_back);
    issues.push({ severity: "REVIEW", item: `_prisma_migrations existe com ${names.length} registro(s): ${names.join(", ") || "(vazia)"}` });
    if (failed.length) issues.push({ severity: "BLOCKER", item: `migrations com falha/rollback registradas: ${failed.map((m) => m.migration_name).join(", ")}` });
  }
  if (actual.userRoles) {
    const admins = actual.userRoles.filter((r) => r.active && ["ADMIN", "SUPER_ADMIN"].includes(String(r.role).toUpperCase())).reduce((a, r) => a + r.n, 0);
    if (admins === 0) issues.push({ severity: "BLOCKER", item: "nenhum usuário ativo com papel ADMIN: o fluxo novo ficaria inacessível" });
  }
  const verdict = issues.some((i) => i.severity === "BLOCKER") ? "BLOQUEADO" : issues.some((i) => i.severity === "REVIEW") ? "REVISAR" : "COMPATÍVEL";
  return { verdict, issues };
}

async function main() {
  const rawUrl = process.env.INSPECT_DATABASE_URL || process.env.DATABASE_URL;
  const target = parseDatabaseTarget(rawUrl);
  if (!target || !target.host) die("URL do banco ausente ou inválida.");
  const local = DEFAULT_LOCAL_HOSTS.includes(target.host);
  if (!local && String(process.env.INSPECT_CONFIRM_HOST || "").trim().toLowerCase() !== target.host) {
    die(`Host externo (${target.host}) exige INSPECT_CONFIRM_HOST igual ao host.`);
  }
  const schema = new URL(rawUrl).searchParams.get("schema") || "public";
  console.log(`[CATALOG] Destino: ${target.description} · schema ${schema} · somente leitura`);

  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: rawUrl } } });
  try {
    const cat = await inspect(db, schema);
    console.log(`[CATALOG] PostgreSQL ${cat.version} · ${cat.tables.length} tabela(s)`);
    if (has("--write-reference")) {
      const ref = arg("--reference") || path.join(__dirname, "..", "prisma", "reference", "legacy-catalog.json");
      fs.mkdirSync(path.dirname(ref), { recursive: true });
      const { rowCounts, userRoles, migrations, database, version, ...structure } = cat;
      fs.writeFileSync(ref, JSON.stringify(structure, null, 2) + "\n");
      console.log(`[CATALOG] Referência gravada: ${path.relative(process.cwd(), ref)}`);
      return;
    }
    let report = { target: target.description, schema, version: cat.version, tables: cat.tables, rowCounts: cat.rowCounts, userRoles: cat.userRoles, migrations: cat.migrations };
    const refPath = arg("--reference");
    if (refPath) {
      const reference = JSON.parse(fs.readFileSync(refPath, "utf8"));
      report = { ...report, ...compare(cat, reference) };
      console.log(`[CATALOG] Veredito: ${report.verdict}`);
      for (const i of report.issues) console.log(`  [${i.severity}] ${i.item}${i.expected ? `\n      esperado: ${i.expected}` : ""}${i.actual ? `\n      atual:    ${i.actual}` : ""}`);
    }
    const out = arg("--out");
    if (out) { fs.writeFileSync(out, JSON.stringify({ ...report, catalog: has("--full") ? cat : undefined }, null, 2)); console.log(`[CATALOG] Relatório: ${out}`); }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => die(mask(e && e.message ? e.message : e)));
