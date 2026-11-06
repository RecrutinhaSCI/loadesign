// Testes puros do guard do ambiente de testes e da configuração do PostgreSQL
// local. Não conectam em banco nem em rede (arquivos temporários apenas).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { assertTestDatabaseEnv, loadTestEnv, TEST_DB_NAME } = require("../support/testEnv");

const ROOT = path.resolve(__dirname, "..", "..");
const SECRET = "S3cr3t-T3st-xyz";
const TEST_URL = `postgresql://u:${SECRET}@localhost:55432/loadesign_test?schema=public`;

const refused = (env, re) => {
  assert.throws(() => assertTestDatabaseEnv(env), (err) => {
    assert.ok(!err.message.includes(SECRET), "mensagem não pode conter a senha");
    if (re) assert.match(err.message, re);
    return err.name === "DatabaseGuardError";
  });
};

function tmpEnvFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loa-test-env-"));
  const file = path.join(dir, ".env.test");
  fs.writeFileSync(file, content);
  return file;
}

test("aceita somente NODE_ENV=test + host local + banco loadesign_test", () => {
  const t = assertTestDatabaseEnv({ NODE_ENV: "test", DATABASE_URL: TEST_URL });
  assert.equal(t.database, TEST_DB_NAME);
});

test("recusa banco de desenvolvimento ou qualquer outro nome", () => {
  for (const db of ["loadesign_dev", "loadesign", "postgres", "loadesign_test2", "Loadesign_test"]) {
    refused({ NODE_ENV: "test", DATABASE_URL: `postgresql://u:${SECRET}@localhost:55432/${db}` }, /loadesign_test/);
  }
});

test("recusa NODE_ENV diferente de test", () => {
  for (const n of [undefined, "", "development", "production"]) {
    refused({ NODE_ENV: n, DATABASE_URL: TEST_URL }, /NODE_ENV/);
  }
});

test("recusa host externo mesmo com nome de banco correto", () => {
  refused({ NODE_ENV: "test", DATABASE_URL: `postgresql://u:${SECRET}@ep-x.aws.neon.tech/loadesign_test?sslmode=require` });
  refused({ NODE_ENV: "test", DATABASE_URL: "postgresql://u:p@localhost/loadesign_test?host=db.example.com" });
  refused({ NODE_ENV: "test", DATABASE_URL: TEST_URL, DIRECT_URL: "postgresql://u:p@ep-x.neon.tech/x" });
});

test("recusa DB_ALLOWED_HOSTS nos testes", () => {
  refused({ NODE_ENV: "test", DATABASE_URL: TEST_URL, DB_ALLOWED_HOSTS: "postgres" }, /DB_ALLOWED_HOSTS/);
});

test("loadTestEnv: .env.test ausente falha de forma segura", () => {
  assert.throws(() => loadTestEnv({ file: path.join(os.tmpdir(), "nao-existe-loa", ".env.test"), base: {} }), /não encontrado/);
});

test("loadTestEnv: variáveis do shell não vencem o .env.test", () => {
  const file = tmpEnvFile(`NODE_ENV=test\nDATABASE_URL="${TEST_URL}"\n`);
  const { env } = loadTestEnv({
    file,
    base: { NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/neondb", DIRECT_URL: "postgresql://u:p@ep-x.neon.tech/neondb", PATH: "x" },
  });
  assert.equal(env.NODE_ENV, "test");
  assert.equal(env.DATABASE_URL, TEST_URL);
  assert.equal(env.DIRECT_URL, "", "DIRECT_URL herdada deve ser descartada");
  assert.equal(env.PATH, "x");
});

test("loadTestEnv: .env.test apontando para o banco de dev é recusado", () => {
  const file = tmpEnvFile('NODE_ENV=test\nDATABASE_URL="postgresql://u:p@localhost:55432/loadesign_dev"\n');
  assert.throws(() => loadTestEnv({ file, base: {} }), /loadesign_test/);
});

test("loadTestEnv: .env.test sem DATABASE_URL não herda a do shell", () => {
  const file = tmpEnvFile("NODE_ENV=test\n");
  assert.throws(() => loadTestEnv({ file, base: { DATABASE_URL: TEST_URL } }), /DATABASE_URL|loadesign_test/);
});

test("testes de integração carregam o guard antes da API", () => {
  const src = fs.readFileSync(path.join(ROOT, "tests", "support", "app.js"), "utf8");
  assert.ok(src.indexOf("applyTestEnv()") < src.indexOf('require("../../src/server")'));
  assert.ok(src.indexOf("assertConnectedToTestDb();") < src.indexOf("deleteMany"));
  for (const f of fs.readdirSync(path.join(ROOT, "tests", "integration"))) {
    const t = fs.readFileSync(path.join(ROOT, "tests", "integration", f), "utf8");
    assert.doesNotMatch(t, /require\(["'][./]*src\//, `${f} deve carregar a API só via tests/support/app.js`);
  }
});

test("scripts de teste passam pelo executor com guard", () => {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  for (const k of ["test:check", "test:db:push", "test:integration"]) {
    assert.match(scripts[k], /^node scripts\/test-env-run\.js (check|push|test)$/, k);
  }
  assert.match(scripts["db:push"], /^node scripts\/prisma-safe\.js db push --skip-generate$/);
});

test("docker-compose do backend: isolado, só loopback, healthcheck, sem host externo", () => {
  const y = fs.readFileSync(path.join(ROOT, "docker-compose.yml"), "utf8");
  assert.match(y, /^name: loadesign-local$/m);
  assert.match(y, /container_name: loadesign-local-postgres/);
  assert.match(y, /"127\.0\.0\.1:55432:5432"/);
  assert.match(y, /name: loadesign_local_pgdata/);
  assert.match(y, /healthcheck:/);
  assert.match(y, /POSTGRES_DB: loadesign_dev/);
  assert.doesNotMatch(y, /neon|supabase|render\.com|railway/i);
  const init = fs.readFileSync(path.join(ROOT, "docker", "postgres", "init", "01-create-test-db.sql"), "utf8");
  assert.match(init, /CREATE DATABASE loadesign_test/);
  assert.doesNotMatch(init, /DROP/i);
});
