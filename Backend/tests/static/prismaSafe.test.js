// Testes puros do executor seguro do Prisma CLI — não executa o Prisma.
const test = require("node:test");
const assert = require("node:assert/strict");
const { decide, commandKey, readProviders } = require("../../scripts/prisma-safe");

const LOCAL = { DATABASE_URL: "postgresql://loa:loa@localhost:5432/loadesign", NODE_ENV: "development" };
const EXTERNAL = { DATABASE_URL: "postgresql://u:p@ep-x.aws.neon.tech/neondb?sslmode=require", NODE_ENV: "production" };
const MATCH = { schemaProvider: "postgresql", lockProvider: "postgresql" };
const MISMATCH = { schemaProvider: "postgresql", lockProvider: "sqlite" };

test("identifica comandos de uma e duas palavras", () => {
  assert.equal(commandKey(["migrate", "reset", "--force"]), "migrate reset");
  assert.equal(commandKey(["migrate", "dev", "--name", "init"]), "migrate dev");
  assert.equal(commandKey(["generate"]), "generate");
  // Flag com valor ANTES do comando gera chave desconhecida → recusado (falha segura).
  assert.equal(decide(["--schema", "x", "migrate", "reset"], LOCAL, MATCH).allowed, false);
});

test("comandos offline rodam sem checar destino", () => {
  for (const c of [["generate"], ["validate"], ["format"], ["version"]]) {
    assert.equal(decide(c, {}, MISMATCH).allowed, true, c.join(" "));
  }
});

test("comandos destrutivos/locais recusam host externo, mesmo com NODE_ENV=production", () => {
  const cmds = [
    ["migrate", "dev"], ["migrate", "reset", "--force"], ["db", "push", "--skip-generate"],
    ["db", "pull"], ["db", "execute"], ["db", "seed"], ["studio"], ["migrate", "status"], ["migrate", "diff"],
  ];
  for (const c of cmds) {
    const d = decide(c, EXTERNAL, MATCH);
    assert.equal(d.allowed, false, c.join(" "));
    assert.ok(!d.reason.includes("sslmode"));
    assert.equal(decide(c, LOCAL, MATCH).allowed, true, `${c.join(" ")} local`);
  }
});

test("URL inválida ou ausente bloqueia comandos locais", () => {
  assert.equal(decide(["migrate", "reset"], { DATABASE_URL: "x" }, MATCH).allowed, false);
  assert.equal(decide(["migrate", "reset"], {}, MATCH).allowed, false);
});

test("flags que apontam para outro banco são sempre recusadas", () => {
  for (const f of ["--url", "--from-url=postgresql://a@b/c", "--to-url", "--shadow-database-url"]) {
    assert.equal(decide(["migrate", "diff", f], LOCAL, MATCH).allowed, false, f);
    assert.equal(decide(["db", "execute", f], LOCAL, MATCH).allowed, false, f);
  }
});

test("flags que descartam dados são sempre recusadas, inclusive em banco local", () => {
  for (const f of ["--accept-data-loss", "--force-reset"]) {
    const d = decide(["db", "push", f], LOCAL, MATCH);
    assert.equal(d.allowed, false, f);
    assert.match(d.reason, /descarta dados/);
  }
});

test("comandos desconhecidos são recusados", () => {
  assert.equal(decide(["foo"], LOCAL, MATCH).allowed, false);
  assert.equal(decide([], LOCAL, MATCH).allowed, false);
});

test("migrate deploy bloqueado enquanto o lock for de outro provider", () => {
  const env = { ...EXTERNAL, PRISMA_PROD_CONFIRM_HOST: "ep-x.aws.neon.tech" };
  const d = decide(["migrate", "deploy"], env, MISMATCH);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /Baseline/);
});

test("migrate deploy/resolve exigem confirmação explícita do host", () => {
  for (const c of [["migrate", "deploy"], ["migrate", "resolve", "--applied", "0_baseline"]]) {
    assert.equal(decide(c, EXTERNAL, MATCH).allowed, false, "sem confirmação");
    assert.equal(decide(c, { ...EXTERNAL, PRISMA_PROD_CONFIRM_HOST: "outro.host" }, MATCH).allowed, false, "host errado");
    assert.equal(decide(c, { ...EXTERNAL, PRISMA_PROD_CONFIRM_HOST: "ep-x.aws.neon.tech" }, MATCH).allowed, true, "confirmado");
  }
});

// ─── migrate status supervisionado (fluxo prod-migrate.js) ──────────────────
const RO_URL = "postgresql://u:p@ep-x.aws.neon.tech/neondb?sslmode=require&options=-c%20default_transaction_read_only%3Don";
const SUP = {
  DATABASE_URL: RO_URL, NODE_ENV: "production", PRISMA_SAFE_SUPERVISED_STATUS: "1",
  PRISMA_PROD_CONFIRM_HOST: "ep-x.aws.neon.tech", PRISMA_SAFE_EXPECTED_DATABASE: "neondb",
};
const withUrl = (patch) => { const u = new URL(RO_URL); for (const [k, v] of Object.entries(patch)) v === null ? u.searchParams.delete(k) : u.searchParams.set(k, v); return u.toString(); };

test("status remoto supervisionado: permitido só com todas as condições", () => {
  const d = decide(["migrate", "status"], SUP, MATCH);
  assert.equal(d.allowed, true, d.reason);
  assert.equal(d.policy, "supervised-readonly");
});

test("status remoto: bloqueado por padrão e em cada condição ausente", () => {
  const cases = {
    "sem marcador supervisionado": { ...SUP, PRISMA_SAFE_SUPERVISED_STATUS: "" },
    "host não confirmado": { ...SUP, PRISMA_PROD_CONFIRM_HOST: "" },
    "host diferente": { ...SUP, PRISMA_PROD_CONFIRM_HOST: "outro.neon.tech" },
    "banco diferente": { ...SUP, PRISMA_SAFE_EXPECTED_DATABASE: "outro" },
    "banco não informado": { ...SUP, PRISMA_SAFE_EXPECTED_DATABASE: "" },
    "pooler": { ...SUP, DATABASE_URL: RO_URL.replace("ep-x.aws", "ep-x-pooler.aws"), PRISMA_PROD_CONFIRM_HOST: "ep-x-pooler.aws.neon.tech" },
    "sem SSL": { ...SUP, DATABASE_URL: withUrl({ sslmode: null }) },
    "SSL desabilitado": { ...SUP, DATABASE_URL: withUrl({ sslmode: "disable" }) },
    "sem sessão somente leitura": { ...SUP, DATABASE_URL: withUrl({ options: null }) },
    "read_only=off": { ...SUP, DATABASE_URL: withUrl({ options: "-c default_transaction_read_only=off" }) },
  };
  for (const [name, env] of Object.entries(cases)) {
    assert.equal(decide(["migrate", "status"], env, MATCH).allowed, false, name);
  }
  assert.equal(decide(["migrate", "status"], SUP, MISMATCH).allowed, false, "lock incompatível");
  assert.equal(decide(["migrate", "status", "--schema", "x"], SUP, MATCH).allowed, false, "argumentos extras");
});

test("marcador supervisionado não amplia nenhum outro comando", () => {
  for (const c of [["migrate", "dev"], ["migrate", "reset", "--force"], ["db", "push"], ["db", "execute"], ["db", "pull"], ["migrate", "diff"], ["studio"]]) {
    assert.equal(decide(c, SUP, MATCH).allowed, false, c.join(" "));
  }
  // deploy/resolve seguem exigindo apenas a política de produção (inalterada).
  const noConfirm = { ...SUP, PRISMA_PROD_CONFIRM_HOST: "" };
  assert.equal(decide(["migrate", "deploy"], noConfirm, MATCH).allowed, false);
  assert.equal(decide(["migrate", "deploy"], SUP, MATCH).policy, "production");
});

test("status local continua pela política local", () => {
  const d = decide(["migrate", "status"], LOCAL, MATCH);
  assert.equal(d.allowed, true);
  assert.equal(d.policy, "local");
});

test("estado atual do repositório: lock SQLite × schema PostgreSQL detectado", () => {
  const p = readProviders();
  assert.equal(p.schemaProvider, "postgresql");
  // Enquanto o baseline (Etapa 2.3) não for feito, deploy deve ficar bloqueado.
  if (p.lockProvider !== p.schemaProvider) {
    assert.equal(decide(["migrate", "deploy"], { ...EXTERNAL, PRISMA_PROD_CONFIRM_HOST: "ep-x.aws.neon.tech" }, p).allowed, false);
  }
});
