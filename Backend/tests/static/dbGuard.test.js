// Testes puros do guard de banco — sem rede, sem banco, sem dependências.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertSafeDatabaseUrl,
  assertSafeDatabaseEnv,
  parseDatabaseTarget,
} = require("../../src/config/dbGuard");

const SECRET = "S3cr3t-P4ss-xyz";
const ok = (opts) => assert.doesNotThrow(() => assertSafeDatabaseUrl(opts));
const refused = (opts) => {
  let msg = "";
  assert.throws(() => assertSafeDatabaseUrl(opts), (err) => {
    msg = err.message;
    return err.name === "DatabaseGuardError";
  });
  assert.ok(!msg.includes(SECRET), "mensagem não pode conter a senha");
  assert.ok(!msg.includes("sslmode"), "mensagem não pode conter a query string");
};

test("aceita hosts locais", () => {
  ok({ databaseUrl: "postgresql://loa:loa@localhost:5432/loadesign", nodeEnv: "development" });
  ok({ databaseUrl: "postgres://u:p@127.0.0.1:5433/db", nodeEnv: "test" });
  ok({ databaseUrl: "postgresql://u:p@[::1]:5432/db", nodeEnv: "development" });
});

test("recusa hosts externos sem depender de 'neon.tech'", () => {
  refused({ databaseUrl: `postgresql://u:${SECRET}@ep-x.us-east-2.aws.neon.tech/db?sslmode=require`, nodeEnv: "development" });
  refused({ databaseUrl: `postgresql://u:${SECRET}@db.example.com:5432/db`, nodeEnv: undefined });
  refused({ databaseUrl: "postgresql://u:p@10.0.0.5/db", nodeEnv: "development" });
  refused({ databaseUrl: "postgresql://u:p@localhost.evil.com/db", nodeEnv: "development" });
});

test("recusa desvio via ?host= e aceita socket Unix", () => {
  refused({ databaseUrl: "postgresql://u:p@localhost/db?host=ep-x.neon.tech", nodeEnv: "development" });
  ok({ databaseUrl: "postgresql://u:p@localhost/db?host=/var/run/postgresql", nodeEnv: "development" });
});

test("allowlist explícita via DB_ALLOWED_HOSTS", () => {
  ok({ databaseUrl: "postgresql://u:p@postgres:5432/db", nodeEnv: "development", allowedHostsRaw: "postgres" });
  refused({ databaseUrl: "postgresql://u:p@postgres:5432/db", nodeEnv: "development" });
});

test("falha de forma segura com URL ausente, inválida ou de outro protocolo", () => {
  refused({ databaseUrl: "", nodeEnv: "development" });
  refused({ databaseUrl: undefined, nodeEnv: "development" });
  refused({ databaseUrl: `isto nao e url ${SECRET}`, nodeEnv: "development" });
  refused({ databaseUrl: "mysql://u:p@localhost/db", nodeEnv: "development" });
});

test("produção em execução (API) mantém comportamento atual", () => {
  const r = assertSafeDatabaseUrl({ databaseUrl: "postgresql://u:p@ep-x.neon.tech/db", nodeEnv: "production" });
  assert.equal(r.enforced, false);
});

test("ferramentas de manutenção aplicam o guard mesmo com NODE_ENV=production", () => {
  assert.throws(() =>
    assertSafeDatabaseEnv(
      { DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db", NODE_ENV: "production" },
      { alwaysEnforce: true }
    )
  );
});

test("DIRECT_URL e SHADOW_DATABASE_URL externas são recusadas", () => {
  for (const v of ["DIRECT_URL", "SHADOW_DATABASE_URL"]) {
    assert.throws(() =>
      assertSafeDatabaseEnv({
        DATABASE_URL: "postgresql://u:p@localhost/db",
        [v]: "postgresql://u:p@ep-x.neon.tech/db",
        NODE_ENV: "development",
      })
    );
  }
});

test("parseDatabaseTarget não expõe credenciais", () => {
  const t = parseDatabaseTarget(`postgresql://u:${SECRET}@localhost:5432/loadesign?schema=public`);
  assert.equal(t.host, "localhost");
  assert.equal(t.database, "loadesign");
  assert.ok(!JSON.stringify(t).includes(SECRET));
  assert.equal(parseDatabaseTarget("lixo"), null);
});
