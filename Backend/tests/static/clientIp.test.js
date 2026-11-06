// Identificação do IP atrás de proxies e limite de login — Express real + supertest,
// sem banco. O socket do supertest é loopback (127.0.0.1), como o proxy interno
// do Render (10.x) em produção.
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const { trustProxy, clientIpOf, classify, chainShape } = require("../../src/utils/clientIp");
const { createLoginRateLimit } = require("../../src/middlewares/loginRateLimit");

function ipApp() {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.get("/ip", (req, res) => res.json({ ip: req.ip, client: clientIpOf(req), chain: chainShape(req) }));
  return app;
}
const ipFor = async (xff) => {
  const r = request(ipApp()).get("/ip");
  if (xff != null) r.set("X-Forwarded-For", xff);
  return (await r).body;
};

test("classificação de endereços", () => {
  assert.equal(classify("10.26.0.50"), "internal");
  assert.equal(classify("::ffff:10.31.0.5"), "internal");
  assert.equal(classify("127.0.0.1"), "internal");
  assert.equal(classify("172.20.1.1"), "internal");
  assert.equal(classify("100.64.3.4"), "internal");
  assert.equal(classify("fd00::1"), "internal");
  assert.equal(classify("162.158.10.1"), "cloudflare");
  assert.equal(classify("2606:4700::1"), "cloudflare");
  assert.equal(classify("203.0.113.7"), "public");
  assert.equal(classify("2001:db8::7"), "public");
  assert.equal(classify("lixo"), "invalid");
  assert.equal(classify(""), "invalid");
});

test("IP real estável atravessando um ou vários proxies (internos variáveis e Cloudflare)", async () => {
  for (const xff of [
    "203.0.113.7",
    "203.0.113.7, 10.26.0.50",
    "203.0.113.7, 10.31.0.5",
    "203.0.113.7, 10.26.0.50, 10.31.0.5",
    "203.0.113.7, 162.158.10.1, 10.26.0.50",
    "203.0.113.7,162.158.10.1,10.26.0.50,10.31.0.5",
  ]) {
    const b = await ipFor(xff);
    assert.equal(b.client, "203.0.113.7", xff);
  }
});

test("clientes diferentes são distinguidos; IPv6 e IPv4 mapeado", async () => {
  assert.equal((await ipFor("198.51.100.20, 10.26.0.50")).client, "198.51.100.20");
  assert.equal((await ipFor("2001:db8::7, 10.26.0.50")).client, "2001:db8::7");
  assert.equal((await ipFor("::ffff:198.51.100.21, 10.26.0.50")).client, "198.51.100.21");
});

test("cabeçalhos falsificados pelo cliente (à esquerda do IP real) são ignorados", async () => {
  for (const xff of [
    "1.2.3.4, 203.0.113.7, 10.26.0.50",
    "10.0.0.9, 203.0.113.7, 10.26.0.50",       // falso interno
    "162.158.1.1, 203.0.113.7, 10.26.0.50",    // falso Cloudflare
    "lixo, 203.0.113.7, 10.26.0.50",
    "1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7, 10.26.0.50",
  ]) {
    assert.equal((await ipFor(xff)).client, "203.0.113.7", xff);
  }
});

test("cadeias incompletas ou inesperadas → IP desconhecido (nunca um proxy interno)", async () => {
  assert.equal((await ipFor(null)).client, null, "sem X-Forwarded-For: só o proxy");
  assert.equal((await ipFor("10.1.1.1, 10.2.2.2")).client, null, "só endereços internos");
  assert.equal((await ipFor("203.0.113.7, lixo")).client, null, "entrada inválida à direita");
  assert.equal((await ipFor("")).client, null);
  const shape = (await ipFor("1.2.3.4, 203.0.113.7, 10.26.0.50")).chain;
  assert.match(shape, /^[PICX](,[PICX])*$/, "diagnóstico sem endereços");
  assert.doesNotMatch(shape, /\d/);
});

// ─── Limite de login ─────────────────────────────────────────────────────────
function loginApp(limiter) {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.use(express.json());
  app.post("/login", limiter, (req, res) => (req.body.password === "certa" ? res.json({ ok: true }) : res.status(401).json({ ok: false })));
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  return app;
}
const attempt = (app, email, password, xff) => {
  const r = request(app).post("/login").send({ email, password });
  if (xff) r.set("X-Forwarded-For", xff);
  return r;
};

test("conta: 6ª tentativa inválida → 429 mesmo variando o IP e o proxy a cada requisição", async () => {
  const app = loginApp(createLoginRateLimit());
  const ips = ["203.0.113.1", "203.0.113.2", "198.51.100.3", "2001:db8::4", "203.0.113.5"];
  for (let i = 0; i < 5; i++) {
    assert.equal((await attempt(app, "laura@example.test", "errada", `${ips[i]}, 10.${26 + (i % 2) * 5}.0.50`)).status, 401);
  }
  const blocked = await attempt(app, "LAURA@example.test ", "certa", "192.0.2.99, 10.26.0.50");
  assert.equal(blocked.status, 429, "bloqueada inclusive com a senha certa e outro IP");
  assert.ok(Number(blocked.headers["retry-after"]) > 0);
  // outra conta continua entrando
  assert.equal((await attempt(app, "outra@example.test", "certa", "203.0.113.1, 10.26.0.50")).status, 200);
});

test("conta: funciona também sem IP identificável (proxies internos)", async () => {
  const app = loginApp(createLoginRateLimit());
  for (let i = 0; i < 5; i++) assert.equal((await attempt(app, "x@example.test", "errada", "10.26.0.50")).status, 401);
  assert.equal((await attempt(app, "x@example.test", "errada", "10.31.0.5")).status, 429);
});

test("IP: 20 falhas do mesmo cliente bloqueiam só esse cliente", async () => {
  const app = loginApp(createLoginRateLimit());
  for (let i = 0; i < 20; i++) assert.equal((await attempt(app, `c${i}@example.test`, "errada", `203.0.113.50, 10.${i % 2 ? 26 : 31}.0.5`)).status, 401);
  assert.equal((await attempt(app, "nova@example.test", "certa", "203.0.113.50, 10.26.0.5")).status, 429, "mesmo cliente bloqueado");
  assert.equal((await attempt(app, "nova@example.test", "certa", "198.51.100.77, 10.26.0.5")).status, 200, "outro cliente livre");
  // falsificar o XFF não muda o IP identificado
  assert.equal((await attempt(app, "nova2@example.test", "certa", "9.9.9.9, 203.0.113.50, 10.26.0.5")).status, 429);
});

test("sem bloqueio coletivo: falhas sem IP identificável não contam por IP", async () => {
  const app = loginApp(createLoginRateLimit());
  for (let i = 0; i < 30; i++) assert.equal((await attempt(app, `d${i}@example.test`, "errada", "10.26.0.50")).status, 401);
  assert.equal((await attempt(app, "laura@example.test", "certa", "10.26.0.50")).status, 200, "proxy interno compartilhado não bloqueia todos");
});

test("login válido zera o contador da conta; janela expira", async () => {
  let t = 0;
  const app = loginApp(createLoginRateLimit({ now: () => t }));
  for (let i = 0; i < 4; i++) await attempt(app, "z@example.test", "errada", "203.0.113.9, 10.26.0.1");
  assert.equal((await attempt(app, "z@example.test", "certa", "203.0.113.9, 10.26.0.1")).status, 200);
  for (let i = 0; i < 5; i++) await attempt(app, "z@example.test", "errada", "203.0.113.9, 10.26.0.1");
  assert.equal((await attempt(app, "z@example.test", "certa", "203.0.113.9, 10.26.0.1")).status, 429);
  t += 15 * 60 * 1000 + 1;
  assert.equal((await attempt(app, "z@example.test", "certa", "203.0.113.9, 10.26.0.1")).status, 200, "liberada após 15 min");
});

test("diagnóstico registra só o formato da cadeia, nunca endereços", async () => {
  const seen = [];
  const app = loginApp(createLoginRateLimit({ onDiagnostic: (d) => seen.push(d), diagnosticSamples: 2 }));
  for (let i = 0; i < 3; i++) await attempt(app, "w@example.test", "errada", "203.0.113.9, 162.158.1.1, 10.26.0.1");
  assert.equal(seen.length, 2);
  assert.equal(seen[0].chain, "P,C,I,I");
  assert.equal(seen[0].ipResolved, true);
  assert.doesNotMatch(JSON.stringify(seen), /\d+\.\d+/);
});
