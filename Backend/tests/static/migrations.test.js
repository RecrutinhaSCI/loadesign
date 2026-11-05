// Testes estáticos das migrations PostgreSQL (sem banco, sem rede).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { decide, readProviders } = require("../../scripts/prisma-safe");

const ROOT = path.resolve(__dirname, "..", "..");
const MIG = path.join(ROOT, "prisma", "migrations");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const code = (sql) => sql.replace(/--.*$/gm, "");

const LEGACY_TABLES = ["users", "leads", "clients", "projects", "services", "quotes", "transactions", "agency_settings", "testimonials", "portfolio_items", "contact_messages", "contacts", "packages"];
const COMMERCIAL = "prisma/migrations/20261105120000_fluxo_comercial_2_0/migration.sql";

test("diretório ativo é PostgreSQL; SQLite antigo arquivado intacto", () => {
  assert.match(read("prisma/migrations/migration_lock.toml"), /provider = "postgresql"/);
  assert.match(read("prisma/migrations_sqlite_legacy/migration_lock.toml"), /provider = "sqlite"/);
  for (const d of ["20260518232007_init", "20260617210954_init"]) {
    assert.ok(fs.existsSync(path.join(ROOT, "prisma", "migrations_sqlite_legacy", d, "migration.sql")), d);
    assert.ok(!fs.existsSync(path.join(MIG, d)), `${d} não pode estar no diretório ativo`);
  }
  for (const d of fs.readdirSync(MIG).filter((x) => fs.statSync(path.join(MIG, x)).isDirectory())) {
    assert.doesNotMatch(read(`prisma/migrations/${d}/migration.sql`), /PRAGMA|DATETIME/, d);
  }
});

test("migração do Fluxo Comercial é estritamente aditiva", () => {
  const sql = code(read(COMMERCIAL));
  // Cláusulas de FK (ON DELETE/ON UPDATE) não são comandos; removidas antes da checagem.
  const cmds = sql.replace(/ON (DELETE|UPDATE) (RESTRICT|CASCADE|SET NULL|NO ACTION)/g, "");
  assert.doesNotMatch(cmds, /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bUPDATE\b|ALTER\s+COLUMN|RENAME/i);
  for (const t of LEGACY_TABLES) {
    assert.doesNotMatch(sql, new RegExp(`(TABLE|ON|REFERENCES)\\s+"${t}"`), `não pode tocar/referenciar "${t}"`);
  }
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const s of statements) {
    assert.match(s, /^(BEGIN|COMMIT|CREATE TYPE|CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE "[a-z_]+" ADD CONSTRAINT "[A-Za-z_]+" FOREIGN KEY)/, s.slice(0, 80));
  }
  assert.match(sql, /^\s*BEGIN;/m);
  assert.match(sql.trim(), /COMMIT;$/);
});

test("tabela de contatos não reutiliza nome histórico", () => {
  assert.match(read("prisma/schema.prisma"), /@@map\("commercial_contacts"\)/);
  assert.doesNotMatch(code(read(COMMERCIAL)), /TABLE "contacts"/);
});

test("baseline descreve só o legado e nunca é aplicada automaticamente em produção", () => {
  const base = read("prisma/migrations/0_baseline/migration.sql");
  for (const t of ["users", "leads", "clients", "projects", "services", "quotes", "transactions", "agency_settings", "testimonials", "portfolio_items", "contact_messages"]) {
    assert.match(base, new RegExp(`CREATE TABLE "${t}"`), t);
  }
  assert.doesNotMatch(code(base), /commercial_contacts|proposals|receivables/);
  // deploy continua exigindo confirmação explícita do host
  const p = readProviders();
  assert.equal(p.lockProvider, "postgresql");
  const env = { DATABASE_URL: "postgresql://u:p@ep-x.aws.neon.tech/neondb", NODE_ENV: "production" };
  assert.equal(decide(["migrate", "deploy"], env, p).allowed, false);
  assert.equal(decide(["migrate", "deploy"], { ...env, PRISMA_PROD_CONFIRM_HOST: "ep-x.aws.neon.tech" }, p).allowed, true);
  assert.equal(decide(["db", "push"], env, p).allowed, false, "db push nunca em produção");
});

test("script de reversão remove somente tabelas novas", () => {
  const down = code(read("prisma/rollback/20261105120000_fluxo_comercial_2_0.down.sql"));
  for (const t of LEGACY_TABLES) assert.doesNotMatch(down, new RegExp(`DROP TABLE "${t}"`), t);
  assert.match(down, /DROP TABLE "commercial_contacts"/);
});
