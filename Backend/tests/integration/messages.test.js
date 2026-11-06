// Integração: mensagens do formulário público no painel (somente dados sintéticos).
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, prisma, resetDatabase, createUser } = require("../support/app");

let auth;
let viewerAuth;

const send = (body) => request(app).post("/api/contact").send(body);

test.before(async () => {
  await resetDatabase();
  const admin = await createUser();
  const r = await request(app).post("/api/auth/login").send({ email: admin.email, password: admin.password });
  auth = { Authorization: `Bearer ${r.body.data.tokens.accessToken}` };
  const viewer = await createUser({ role: "VIEWER" });
  const v = await request(app).post("/api/auth/login").send({ email: viewer.email, password: viewer.password });
  viewerAuth = { Authorization: `Bearer ${v.body.data.tokens.accessToken}` };
  for (let i = 1; i <= 3; i++) {
    await send({ name: `Pessoa Sintética ${i}`, phone: `5499900000${i}`, email: `p${i}@example.test`, service: i === 2 ? "Identidade visual" : "Social media", message: `Mensagem de teste ${i}` }).expect(201);
  }
});
test.after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

test("listar mensagens exige sessão administrativa", async () => {
  await request(app).get("/api/contact").expect(401);
  await request(app).get("/api/contact").set(viewerAuth).expect(403);
  const res = await request(app).get("/api/contact").set(auth).expect(200);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.body.data.total, 3);
  assert.equal(res.body.data.items.length, 3);
  assert.deepEqual(res.body.data.counts, { NEW: 3, READ: 0, ARCHIVED: 0 });
  // mais recentes primeiro
  assert.equal(res.body.data.items[0].message, "Mensagem de teste 3");
});

test("busca, filtro por status e paginação", async () => {
  const s = await request(app).get("/api/contact?search=identidade").set(auth).expect(200);
  assert.equal(s.body.data.total, 1);
  const p = await request(app).get("/api/contact?page=2&pageSize=2").set(auth).expect(200);
  assert.equal(p.body.data.items.length, 1);
  assert.equal(p.body.data.page, 2);
  await request(app).get("/api/contact?status=qualquer").set(auth).expect(400);
  const big = await request(app).get("/api/contact?pageSize=9999").set(auth).expect(200);
  assert.equal(big.body.data.pageSize, 100);
});

test("alterar status: só valores válidos; lead vinculado é preservado", async () => {
  const list = (await request(app).get("/api/contact").set(auth)).body.data.items;
  const id = list[0].id;
  await request(app).patch(`/api/contact/${id}`).set(auth).send({ status: "invalido" }).expect(400);
  await request(app).patch(`/api/contact/${id}`).set(viewerAuth).send({ status: "READ" }).expect(403);
  const r = await request(app).patch(`/api/contact/${id}`).set(auth).send({ status: "read", message: "alterado" }).expect(200);
  assert.equal(r.body.data.status, "READ");
  assert.equal(r.body.data.message, list[0].message, "só o status muda");
  const counts = (await request(app).get("/api/contact").set(auth)).body.data.counts;
  assert.deepEqual(counts, { NEW: 2, READ: 1, ARCHIVED: 0 });
  const onlyRead = await request(app).get("/api/contact?status=READ").set(auth).expect(200);
  assert.equal(onlyRead.body.data.total, 1);
  assert.ok(await prisma.lead.findUnique({ where: { id: list[0].leadId } }));
});

test("consultar e remover: 404 para inexistente; remover mantém o lead", async () => {
  await request(app).get("/api/contact/inexistente").set(auth).expect(404);
  await request(app).patch("/api/contact/inexistente").set(auth).send({ status: "READ" }).expect(404);
  await request(app).delete("/api/contact/inexistente").set(auth).expect(404);
  const list = (await request(app).get("/api/contact").set(auth)).body.data.items;
  const one = (await request(app).get(`/api/contact/${list[1].id}`).set(auth).expect(200)).body.data;
  assert.equal(one.id, list[1].id);
  await request(app).delete(`/api/contact/${one.id}`).set(viewerAuth).expect(403);
  await request(app).delete(`/api/contact/${one.id}`).set(auth).expect(200);
  assert.equal(await prisma.contactMessage.count(), 2);
  assert.ok(await prisma.lead.findUnique({ where: { id: one.leadId } }), "lead preservado");
});

test("formulário público recusa campos longos demais ou de tipo errado", async () => {
  const before = await prisma.contactMessage.count();
  await send({ name: "x".repeat(121), phone: "54999000000", message: "oi" }).expect(400);
  await send({ name: "Ok", phone: "54999000000", message: "y".repeat(5001) }).expect(400);
  await send({ name: "Ok", phone: { $gt: "" }, message: "oi" }).expect(400);
  assert.equal(await prisma.contactMessage.count(), before);
});
