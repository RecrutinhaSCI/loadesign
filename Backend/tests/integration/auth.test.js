// Integração: autenticação e autorização (PostgreSQL local "loadesign_test").
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app, prisma, resetDatabase, createUser } = require("../support/app");

const PROTECTED = [
  ["get", "/api/clients"], ["post", "/api/clients"],
  ["get", "/api/leads"], ["post", "/api/leads"],
  ["get", "/api/quotes"], ["post", "/api/quotes"],
  ["get", "/api/projects"], ["post", "/api/projects"],
  ["get", "/api/transactions"], ["post", "/api/transactions"],
  ["get", "/api/services"], ["post", "/api/services"],
  ["get", "/api/contact"], ["delete", "/api/contact/x"],
  ["put", "/api/settings"], ["post", "/api/testimonials"], ["post", "/api/portfolio"],
  ["get", "/api/auth/me"], ["post", "/api/auth/change-password"],
];

let admin;

test.before(async () => {
  await resetDatabase();
  admin = await createUser();
});
test.after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const login = (email, password) => request(app).post("/api/auth/login").send({ email, password });

test("login válido devolve token e nunca devolve o hash da senha", async () => {
  const res = await login(admin.email, admin.password).expect(200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.tokens.accessToken);
  assert.equal(res.body.data.user.email, admin.email);
  assert.equal(res.body.data.user.password, undefined);
});

test("login aceita e-mail com maiúsculas/espaços", async () => {
  await login(`  ${admin.email.toUpperCase()} `, admin.password).expect(200);
});

test("login inválido: senha errada, e-mail inexistente, campos ausentes", async () => {
  const wrong = await login(admin.email, "senha-errada-123").expect(401);
  const unknown = await login("ninguem@example.test", "qualquer-coisa").expect(401);
  assert.equal(wrong.body.error, unknown.body.error, "não revela se o e-mail existe");
  await login(admin.email, "").expect(400);
  await request(app).post("/api/auth/login").send({}).expect(400);
});

test("usuário inativo não consegue logar", async () => {
  const inactive = await createUser({ active: false });
  await login(inactive.email, inactive.password).expect(401);
});

test("rotas protegidas exigem token (401 sem Authorization)", async () => {
  for (const [method, url] of PROTECTED) {
    const res = await request(app)[method](url).send({});
    assert.equal(res.status, 401, `${method.toUpperCase()} ${url}`);
    assert.equal(res.body.success, false);
  }
});

test("tokens inválidos são recusados", async () => {
  const bad = [
    "Bearer lixo",
    "Basic abc",
    `Bearer ${jwt.sign({ sub: admin.user.id }, "outro-segredo-qualquer-0000000000000")}`,
    `Bearer ${jwt.sign({ sub: admin.user.id, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET)}`,
  ];
  for (const h of bad) {
    await request(app).get("/api/clients").set("Authorization", h).expect(401);
  }
});

test("/auth/me devolve o usuário autenticado sem senha", async () => {
  const token = (await login(admin.email, admin.password)).body.data.tokens.accessToken;
  const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(res.body.data.id, admin.user.id);
  assert.equal(res.body.data.password, undefined);
});

test("troca de senha: valida senha atual e tamanho; nova senha passa a valer", async () => {
  const u = await createUser();
  const token = (await login(u.email, u.password)).body.data.tokens.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  const novaSenha = "nova-senha-sintetica-123";
  await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: "errada-000", newPassword: novaSenha }).expect(401);
  await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: u.password, newPassword: "curta" }).expect(400);
  await request(app).post("/api/auth/change-password").set(auth).send({}).expect(400);
  await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: u.password, newPassword: novaSenha }).expect(200);
  await login(u.email, u.password).expect(401);
  await login(u.email, novaSenha).expect(200);
  const stored = await prisma.user.findUnique({ where: { id: u.user.id } });
  assert.notEqual(stored.password, novaSenha, "senha persistida como hash");
});

test("usuário desativado após o login perde acesso imediatamente", async () => {
  const u = await createUser();
  const token = (await login(u.email, u.password)).body.data.tokens.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).get("/api/clients").set(auth).expect(200);
  await prisma.user.update({ where: { id: u.user.id }, data: { active: false } });
  for (const url of ["/api/clients", "/api/contacts", "/api/dashboard", "/api/auth/me"]) {
    await request(app).get(url).set(auth).expect(401);
  }
});

test("usuário removido perde acesso; token de usuário inexistente é recusado", async () => {
  const u = await createUser();
  const token = (await login(u.email, u.password)).body.data.tokens.accessToken;
  await prisma.user.delete({ where: { id: u.user.id } });
  await request(app).get("/api/clients").set("Authorization", `Bearer ${token}`).expect(401);
  const ghost = jwt.sign({ sub: "usuario-inexistente" }, process.env.JWT_SECRET);
  await request(app).get("/api/clients").set("Authorization", `Bearer ${ghost}`).expect(401);
});

test("papel vem do banco: usuário sem papel administrativo não acessa o fluxo comercial", async () => {
  const u = await createUser({ role: "VIEWER" });
  const token = (await login(u.email, u.password)).body.data.tokens.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  for (const url of ["/api/contacts", "/api/proposals", "/api/work-projects", "/api/receivables", "/api/dashboard"]) {
    await request(app).get(url).set(auth).expect(403);
  }
  // admin com papel em minúsculas (legado) continua com acesso
  const legacyAdmin = await createUser({ role: "admin" });
  const t2 = (await login(legacyAdmin.email, legacyAdmin.password)).body.data.tokens.accessToken;
  await request(app).get("/api/contacts").set("Authorization", `Bearer ${t2}`).expect(200);
});

// ─── Sprint final: rate limit, invalidação de sessão, papel nas rotas legadas ──
const { loginRateLimit } = require("../support/app");

test("limite de login: 5 falhas por conta bloqueiam com 429 + Retry-After; sucesso zera", async () => {
  loginRateLimit.reset();
  const u = await createUser();
  for (let i = 0; i < 5; i++) await login(u.email, `errada-${i}-000000`).expect(401);
  const blocked = await login(u.email, u.password).expect(429);
  assert.ok(Number(blocked.headers["retry-after"]) > 0);
  assert.equal(blocked.body.success, false);
  // outra conta no mesmo IP continua podendo entrar
  const other = await createUser();
  await login(other.email, other.password).expect(200);
  loginRateLimit.reset();
  await login(u.email, u.password).expect(200);
  // sucesso zera o contador daquela conta
  for (let i = 0; i < 4; i++) await login(u.email, `errada-${i}-000000`).expect(401);
  await login(u.email, u.password).expect(200);
  for (let i = 0; i < 4; i++) await login(u.email, `errada-${i}-000000`).expect(401);
  await login(u.email, u.password).expect(200);
  loginRateLimit.reset();
});

// Simula a cadeia do Render: IP público do cliente + proxies internos variáveis.
const loginVia = (xff, email, password) =>
  request(app).post("/api/auth/login").set("X-Forwarded-For", xff).send({ email, password });

test("limite de login por IP: 20 falhas do mesmo cliente bloqueiam só esse cliente", async () => {
  loginRateLimit.reset();
  for (let i = 0; i < 20; i++) {
    await loginVia(`203.0.113.40, 10.${i % 2 ? 26 : 31}.0.5`, `ninguem${i}@example.test`, "qualquer-coisa-000").expect(401);
  }
  await loginVia("203.0.113.40, 10.26.0.5", admin.email, admin.password).expect(429);
  await loginVia("1.2.3.4, 203.0.113.40, 10.26.0.5", admin.email, admin.password).expect(429); // XFF falsificado não ajuda
  await loginVia("198.51.100.41, 10.26.0.5", admin.email, admin.password).expect(200);           // outro cliente livre
  loginRateLimit.reset();
  await loginVia("203.0.113.40, 10.26.0.5", admin.email, admin.password).expect(200);
});

test("limite por conta não depende do IP: IPs e proxies variando → 6ª tentativa 429", async () => {
  loginRateLimit.reset();
  const u = await createUser();
  for (let i = 0; i < 5; i++) {
    await loginVia(`198.51.100.${10 + i}, 10.${i % 2 ? 26 : 31}.0.${i}`, u.email, `errada-${i}-000000`).expect(401);
  }
  await loginVia("192.0.2.200, 10.26.0.9", u.email, u.password).expect(429);
  loginRateLimit.reset();
});

test("sem IP identificável (só proxies internos), falhas de terceiros não bloqueiam a conta da administradora", async () => {
  loginRateLimit.reset();
  for (let i = 0; i < 25; i++) await loginVia("10.26.0.50", `terceiro${i}@example.test`, "qualquer-coisa-000").expect(401);
  await loginVia("10.26.0.50", admin.email, admin.password).expect(200);
  loginRateLimit.reset();
});

test("troca de senha invalida TODOS os tokens anteriores; novo login funciona", async () => {
  loginRateLimit.reset();
  const u = await createUser();
  const t1 = (await login(u.email, u.password)).body.data.tokens.accessToken;
  const t2 = (await login(u.email, u.password)).body.data.tokens.accessToken;
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${t1}`).expect(200);
  const novaSenha = "outra-senha-sintetica-456";
  await request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${t1}`)
    .send({ currentPassword: u.password, newPassword: novaSenha }).expect(200);
  for (const t of [t1, t2]) {
    for (const url of ["/api/auth/me", "/api/clients", "/api/contacts"]) {
      await request(app).get(url).set("Authorization", `Bearer ${t}`).expect(401);
    }
  }
  const t3 = (await login(u.email, novaSenha).expect(200)).body.data.tokens.accessToken;
  await request(app).get("/api/contacts").set("Authorization", `Bearer ${t3}`).expect(200);
});

test("redefinição administrativa direta no banco também invalida as sessões", async () => {
  loginRateLimit.reset();
  const u = await createUser();
  const t = (await login(u.email, u.password)).body.data.tokens.accessToken;
  const bcrypt = require("bcryptjs");
  await prisma.user.update({ where: { id: u.user.id }, data: { password: await bcrypt.hash("redefinida-sintetica-789", 4) } });
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${t}`).expect(401);
});

test("token assinado corretamente mas sem versão de sessão (emitido antes) é recusado", async () => {
  const old = jwt.sign({ sub: admin.user.id, email: admin.email, role: "ADMIN" }, process.env.JWT_SECRET);
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${old}`).expect(401);
  const fake = jwt.sign({ sub: admin.user.id, sv: "x".repeat(22) }, process.env.JWT_SECRET);
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${fake}`).expect(401);
  const none = jwt.sign({ sub: admin.user.id }, "", { algorithm: "none" });
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${none}`).expect(401);
});

test("nova senha igual à atual é recusada", async () => {
  loginRateLimit.reset();
  const u = await createUser();
  const t = (await login(u.email, u.password)).body.data.tokens.accessToken;
  await request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${t}`)
    .send({ currentPassword: u.password, newPassword: u.password }).expect(400);
});

test("rotas administrativas legadas exigem papel administrativo (403 para outros papéis)", async () => {
  loginRateLimit.reset();
  const u = await createUser({ role: "VIEWER" });
  const auth = { Authorization: `Bearer ${(await login(u.email, u.password)).body.data.tokens.accessToken}` };
  for (const [m, url] of [["get", "/api/clients"], ["get", "/api/leads"], ["get", "/api/quotes"], ["get", "/api/projects"],
    ["get", "/api/transactions"], ["get", "/api/services"], ["post", "/api/testimonials"], ["post", "/api/portfolio"], ["put", "/api/settings"]]) {
    const r = await request(app)[m](url).set(auth).send({});
    assert.equal(r.status, 403, `${m.toUpperCase()} ${url}`);
  }
  // o próprio usuário ainda consulta /auth/me
  await request(app).get("/api/auth/me").set(auth).expect(200);
  // rotas públicas continuam públicas
  await request(app).get("/api/settings").expect(200);
  await request(app).get("/api/services/public").expect(200);
});
