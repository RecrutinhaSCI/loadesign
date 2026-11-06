// Testes estáticos de configuração: package.json, render.yaml, seeds e
// ausência de credenciais fixas. Apenas leitura de arquivos locais.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const pkg = JSON.parse(read("package.json"));
const scripts = pkg.scripts || {};
const render = read("render.yaml");

const DB_WRITE = /prisma\s+(migrate\s+(deploy|dev|reset|resolve)|db\s+(push|seed|execute|pull))|--accept-data-loss|--force-reset/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "tests", "migrations"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|json|ya?ml|toml)$/.test(e.name)) out.push(p);
  }
  return out;
}

// ── Build / scripts ──────────────────────────────────────────────────────────
test("build não executa migrations, db push nem seed", () => {
  assert.ok(scripts.build, "script build deve existir");
  assert.doesNotMatch(scripts.build, DB_WRITE);
  assert.doesNotMatch(scripts.build, /seed|bootstrap/);
});

test("postinstall, start e dev não tocam no schema nem em dados", () => {
  for (const k of ["postinstall", "start", "dev"]) {
    if (scripts[k]) assert.doesNotMatch(scripts[k], DB_WRITE, k);
    if (scripts[k]) assert.doesNotMatch(scripts[k], /seed/, k);
  }
});

test("nenhum script chama Prisma CLI de escrita diretamente (só via prisma-safe)", () => {
  for (const [k, v] of Object.entries(scripts)) {
    assert.doesNotMatch(v, DB_WRITE, `script ${k} chama Prisma de escrita sem o executor seguro`);
    assert.doesNotMatch(v, /\bnpx\b/, `script ${k} usa npx`);
  }
});

test("scripts db:* que conectam no banco passam pelo executor seguro", () => {
  for (const k of ["db:migrate", "db:migrate:prod", "db:reset", "db:studio"]) {
    assert.match(scripts[k], /^node scripts\/prisma-safe\.js /, k);
  }
  assert.match(scripts["db:reset"], /--skip-seed/);
});

test("não há seed automático (prisma.seed ausente; seed de demo fora dos scripts)", () => {
  assert.equal(pkg.prisma && pkg.prisma.seed, undefined);
  for (const [k, v] of Object.entries(scripts)) {
    assert.doesNotMatch(v, /seed\.demo/, `script ${k} referencia o seed de demo`);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, "prisma", "seed.js")), "seed.js antigo não deve existir");
});

// ── Render ───────────────────────────────────────────────────────────────────
const yamlValue = (key) => {
  const m = render.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : null;
};

test("render.yaml: build e start sem migrations/seed", () => {
  assert.doesNotMatch(yamlValue("buildCommand"), DB_WRITE);
  assert.doesNotMatch(yamlValue("buildCommand"), /seed/);
  assert.doesNotMatch(yamlValue("startCommand"), DB_WRITE);
  assert.doesNotMatch(yamlValue("startCommand"), /seed|migrate/);
});

test("render.yaml: configuração de execução preservada", () => {
  assert.equal(yamlValue("startCommand"), "npm start");
  assert.equal(yamlValue("healthCheckPath"), "/api/health");
  assert.equal(yamlValue("runtime"), "node");
  assert.match(yamlValue("buildCommand"), /prisma generate/);
  for (const key of ["NODE_ENV", "PORT", "DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN", "CORS_ORIGIN"]) {
    assert.match(render, new RegExp(`key:\\s*${key}\\b`), `envVar ${key}`);
  }
  assert.equal(scripts.start, "node src/server.js");
});

// ── Seeds ────────────────────────────────────────────────────────────────────
// Remove comentários para que a documentação não gere falsos positivos.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("bootstrap é não destrutivo e sem credenciais fixas", () => {
  const src = code(read("prisma/bootstrap.js"));
  assert.doesNotMatch(src, /deleteMany|\.delete\(|\.update\(|updateMany|upsert|\$executeRaw|TRUNCATE|DROP/i);
  assert.match(src, /assertSafeDatabaseEnv\(process\.env, \{ alwaysEnforce: true \}\)/);
  assert.match(src, /BOOTSTRAP_ADMIN_PASSWORD/);
  // Nenhuma interpolação da senha em logs/strings.
  assert.doesNotMatch(src, /\$\{\s*ADMIN_PASSWORD/);
  assert.doesNotMatch(src, /console\.\w+\(\s*ADMIN_PASSWORD/);
});

test("seed de demo: travado, sem senha fixa, sem redefinir senha, sem sobrescrever pacotes", () => {
  const src = code(read("prisma/seed.demo.js"));
  assert.match(src, /assertSafeDatabaseEnv\(process\.env, \{ alwaysEnforce: true \}\)/);
  assert.match(src, /DEMO_SEED_CONFIRM_DB/);
  assert.doesNotMatch(src, /admin123/);
  assert.doesNotMatch(src, /update:\s*\{\s*password/);
  assert.doesNotMatch(src, /update:\s*fields/);
  assert.doesNotMatch(src, /\$\{\s*(DEMO_ADMIN_PASSWORD|adminPlain)/);
  assert.doesNotMatch(src, /console\.\w+\(\s*(DEMO_ADMIN_PASSWORD|adminPlain)/);
  // O guard precisa vir antes de qualquer criação do PrismaClient.
  assert.ok(src.indexOf("assertSafeDatabaseEnv(") < src.indexOf("new PrismaClient("));
});

// ── Credenciais ──────────────────────────────────────────────────────────────
test("nenhuma credencial fixa no código do backend", () => {
  const files = walk(ROOT).filter((f) => !/\.example$/.test(f) && !f.endsWith("package-lock.json"));
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const rel = path.relative(ROOT, f);
    assert.doesNotMatch(src, /admin123/, rel);
    assert.doesNotMatch(src, /bcrypt\.hash\(\s*["'`]/, `${rel}: hash de senha literal`);
    // URL postgres com credenciais para host não local
    const urls = src.match(/postgres(?:ql)?:\/\/[^\s"'`]+/g) || [];
    for (const u of urls) {
      const host = (u.match(/@([^:/?]+)/) || [])[1];
      if (host && !["localhost", "127.0.0.1", "HOST", "a"].includes(host)) {
        assert.fail(`${rel}: URL de banco não local embutida (${host})`);
      }
    }
    assert.doesNotMatch(src, /JWT_SECRET\s*[:=]\s*["'][A-Za-z0-9]{32,}["']/, `${rel}: JWT secret literal`);
  }
});

test("exemplos de ambiente não contêm hosts de bancos gerenciados", () => {
  for (const f of [".env.example", ".env.test.example"]) {
    const src = read(f);
    assert.doesNotMatch(src, /neon\.tech|supabase\.com|railway\.app|render\.com/i, f);
    const active = src.split(/\r?\n/).filter((l) => /^DATABASE_URL=/.test(l));
    for (const l of active) assert.match(l, /@localhost:/, `${f}: ${l.split("@")[1]}`);
  }
});
