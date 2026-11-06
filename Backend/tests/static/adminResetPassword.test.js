// Testes puros do script de redefinição administrativa — não conecta em banco.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseTarget, passwordProblems, assertTarget, mask } = require("../../scripts/admin-reset-password");

const HOST = "ep-x.c-3.us-east-2.aws.neon.tech";
const ENV = {
  MIGRATE_DATABASE_URL: `postgresql://owner:pw@${HOST}/neondb?sslmode=require&channel_binding=require`,
  MIGRATE_CONFIRM_HOST: HOST,
  MIGRATE_EXPECTED_BRANCH: "br-prod",
};
const ADMIN = { id: "u1", email: "laura@example.test", role: "ADMIN", active: true, updatedAt: new Date() };
const STATE = { ro: "on", database: "neondb", branch: "br-prod", users: [ADMIN] };

test("alvo remoto: SSL obrigatório, sessão de leitura forçada, sem channel_binding", () => {
  const t = parseTarget(ENV);
  assert.equal(t.local, false);
  assert.equal(new URL(t.url).searchParams.get("sslmode"), "require");
  assert.equal(new URL(t.url).searchParams.has("channel_binding"), false);
  assert.match(new URL(t.roUrl).searchParams.get("options"), /default_transaction_read_only=on/);
  assert.equal(new URL(t.url).searchParams.has("options"), false);
});

test("alvo recusado: host não confirmado, pooler, sem branch, local fora de ensaio, ensaio remoto", () => {
  assert.throws(() => parseTarget({ ...ENV, MIGRATE_CONFIRM_HOST: "outro" }), /não confere/);
  const pooler = HOST.replace("ep-x", "ep-x-pooler");
  assert.throws(() => parseTarget({ ...ENV, MIGRATE_DATABASE_URL: ENV.MIGRATE_DATABASE_URL.replace(HOST, pooler), MIGRATE_CONFIRM_HOST: pooler }), /POOLER/);
  assert.throws(() => parseTarget({ ...ENV, MIGRATE_EXPECTED_BRANCH: "" }), /BRANCH/);
  const local = { ...ENV, MIGRATE_DATABASE_URL: "postgresql://a:b@localhost:5432/x", MIGRATE_CONFIRM_HOST: "localhost" };
  assert.throws(() => parseTarget(local), /ensaio/);
  assert.equal(parseTarget(local, { envFile: "x", allowLocal: true }).local, true);
  assert.throws(() => parseTarget(ENV, { envFile: "x", allowLocal: true }), /ensaio local/);
  assert.throws(() => parseTarget({ ...ENV, MIGRATE_DATABASE_URL: `postgresql://owner@${HOST}/neondb` }), /sem senha/);
});

test("política de senha", () => {
  const strong = ["Xq7", "-vR2", "#mT9", "!kLp", "w3Z"].join("");
  assert.deepEqual(passwordProblems(strong), []);
  assert.ok(passwordProblems("curta1A!").length);
  assert.ok(passwordProblems("somenteminusculasmuitolongas").length);
  assert.ok(passwordProblems(` ${strong}`).length, "espaço no início");
  assert.ok(passwordProblems(`Loadesign${strong}`).length, "nome da empresa");
  assert.ok(passwordProblems(`laura${strong}`, { email: "laura@example.test" }).length, "contém o e-mail");
  assert.ok(passwordProblems("A1!".repeat(30)).length, "acima de 72");
});

test("alvo único: exatamente 1 usuário ADMIN ativo, banco/branch corretos, sessão READ ONLY", () => {
  const t = parseTarget(ENV);
  assert.equal(assertTarget(t, STATE).id, "u1");
  assert.throws(() => assertTarget(t, { ...STATE, ro: "off" }), /READ ONLY/);
  assert.throws(() => assertTarget(t, { ...STATE, database: "outro" }), /banco/);
  assert.throws(() => assertTarget(t, { ...STATE, branch: "br-outro" }), /branch/);
  assert.throws(() => assertTarget(t, { ...STATE, users: [] }), /exatamente 1/);
  assert.throws(() => assertTarget(t, { ...STATE, users: [ADMIN, { ...ADMIN, id: "u2" }] }), /exatamente 1/);
  assert.throws(() => assertTarget(t, { ...STATE, users: [{ ...ADMIN, role: "EDITOR" }] }), /ADMIN/);
  assert.throws(() => assertTarget(t, { ...STATE, users: [{ ...ADMIN, active: false }] }), /inativo/);
});

test("mensagens mascaram URL e hash bcrypt", () => {
  const h = "$2a$12$" + "a".repeat(53);
  assert.equal(mask(`falha em postgresql://u:p@h/db e ${h}`), "falha em <url> e <hash>");
});

test("script: senha nunca por argumento/env, não lê coluna de senha, nada impresso de sensível", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "admin-reset-password.js"), "utf8");
  assert.doesNotMatch(src, /process\.env\.[A-Z_]*(PASSWORD|SENHA)/);
  assert.doesNotMatch(src, /process\.argv\[[3-9]\]/);
  assert.doesNotMatch(src, /SELECT[^`"]*password/i, "consultas não selecionam a senha");
  assert.doesNotMatch(src, /console\.\w+\([^)]*\b(pw1|pw2|hash)\b/);
  assert.doesNotMatch(src, /log\([^)]*\$\{\s*(pw1|pw2|hash)\s*\}/);
  assert.doesNotMatch(src, /writeFileSync/);
});
