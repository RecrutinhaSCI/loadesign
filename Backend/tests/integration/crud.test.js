// Integração: CRUD administrativo com persistência real no PostgreSQL local
// ("loadesign_test"). Dados 100% sintéticos.
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, prisma, resetDatabase, createUser } = require("../support/app");

let auth;

test.before(async () => {
  await resetDatabase();
  const admin = await createUser();
  const res = await request(app).post("/api/auth/login").send({ email: admin.email, password: admin.password });
  auth = { Authorization: `Bearer ${res.body.data.tokens.accessToken}` };
});
test.after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const MISSING_ID = "id-inexistente-000";

const RESOURCES = [
  {
    path: "clients", model: "client", required: ["name", "email"],
    create: { name: "Cliente Sintético", email: "cliente@example.test", phone: "54900000001" },
    check: (r) => assert.equal(r.email, "cliente@example.test"),
    patch: { company: "Empresa Fictícia" },
    checkPatch: (r) => assert.equal(r.company, "Empresa Fictícia"),
  },
  {
    path: "leads", model: "lead", required: ["name", "email"],
    create: { name: "Lead Sintético", email: "lead@example.test", tags: ["site", "teste"] },
    check: (r, db) => { assert.deepEqual(r.tags, ["site", "teste"]); assert.equal(db.tags, JSON.stringify(["site", "teste"])); },
    patch: { status: "contacted", tags: ["qualificado"] },
    checkPatch: (r, db) => { assert.equal(db.status, "contacted"); assert.deepEqual(r.tags, ["qualificado"]); },
  },
  {
    path: "quotes", model: "quote", required: ["clientName", "validUntil"],
    create: {
      clientName: "Cliente Orçamento", validUntil: "2030-01-31T00:00:00.000Z",
      items: [{ description: "Item fictício", quantity: 2, unitPrice: 150 }], total: 300,
    },
    check: (r, db) => {
      assert.equal(r.items.length, 1);
      assert.equal(r.validUntil, "2030-01-31T00:00:00.000Z");
      assert.equal(db.total, 300);
    },
    patch: { status: "sent", discount: 10 },
    checkPatch: (r, db) => { assert.equal(db.status, "sent"); assert.equal(db.discount, 10); },
  },
  {
    path: "projects", model: "project", required: ["name", "deadline"],
    create: { name: "Projeto Sintético", deadline: "2030-02-28T00:00:00.000Z", client: "Cliente Projeto" },
    check: (r, db) => { assert.equal(r.client, "Cliente Projeto"); assert.equal(db.clientName, "Cliente Projeto"); },
    patch: { progress: 50, status: "IN_PROGRESS" },
    checkPatch: (r, db) => { assert.equal(db.progress, 50); assert.equal(db.status, "IN_PROGRESS"); },
  },
  {
    path: "services", model: "service", required: ["name", "slug"],
    create: { name: "Serviço Sintético", slug: "servico-sintetico-crud", description: "Descrição fictícia", price: 999.9, items: ["a", "b"] },
    check: (r, db) => { assert.equal(r.price, 999.9); assert.deepEqual(r.items, ["a", "b"]); assert.equal(db.slug, "servico-sintetico-crud"); },
    patch: { price: 1200 },
    checkPatch: (r, db) => assert.equal(db.price, 1200),
  },
  {
    path: "transactions", model: "transaction", required: ["description", "type", "value", "date"],
    create: { description: "Receita fictícia", type: "income", value: 1500.5, date: "2030-03-10T00:00:00.000Z" },
    check: (r, db) => { assert.equal(r.date, "2030-03-10T00:00:00.000Z"); assert.equal(db.value, 1500.5); },
    patch: { category: "Projetos" },
    checkPatch: (r, db) => assert.equal(db.category, "Projetos"),
  },
];

for (const R of RESOURCES) {
  test(`CRUD /api/${R.path}`, async (t) => {
    const base = `/api/${R.path}`;
    let id;

    await t.test("POST sem campo obrigatório → 400 e nada persistido", async () => {
      const before = await prisma[R.model].count();
      for (const f of R.required) {
        const body = { ...R.create };
        delete body[f];
        const res = await request(app).post(base).set(auth).send(body).expect(400);
        assert.match(res.body.error, new RegExp(f));
      }
      assert.equal(await prisma[R.model].count(), before);
    });

    await t.test("POST válido → 201 e persistido", async () => {
      const res = await request(app).post(base).set(auth).send(R.create).expect(201);
      id = res.body.data.id;
      assert.ok(id);
      const db = await prisma[R.model].findUnique({ where: { id } });
      assert.ok(db, "registro deve existir no PostgreSQL");
      R.check(res.body.data, db);
    });

    await t.test("GET lista e GET por id", async () => {
      const list = await request(app).get(base).set(auth).expect(200);
      assert.ok(list.body.data.some((r) => r.id === id));
      const one = await request(app).get(`${base}/${id}`).set(auth).expect(200);
      assert.equal(one.body.data.id, id);
    });

    await t.test("PATCH → 200 e alteração persistida; id não é sobrescrito", async () => {
      const res = await request(app).patch(`${base}/${id}`).set(auth).send({ ...R.patch, id: "outro-id" }).expect(200);
      assert.equal(res.body.data.id, id);
      const db = await prisma[R.model].findUnique({ where: { id } });
      R.checkPatch(res.body.data, db);
    });

    await t.test("ids inexistentes → 404", async () => {
      await request(app).get(`${base}/${MISSING_ID}`).set(auth).expect(404);
      await request(app).patch(`${base}/${MISSING_ID}`).set(auth).send(R.patch).expect(404);
      await request(app).delete(`${base}/${MISSING_ID}`).set(auth).expect(404);
    });

    await t.test("DELETE → 200, removido do banco, GET → 404", async () => {
      await request(app).delete(`${base}/${id}`).set(auth).expect(200);
      assert.equal(await prisma[R.model].findUnique({ where: { id } }), null);
      await request(app).get(`${base}/${id}`).set(auth).expect(404);
    });
  });
}

test("slug de serviço duplicado → 400 (conflito), sem duplicar no banco", async () => {
  const body = { name: "Dup", slug: "slug-duplicado", description: "x", price: 1 };
  await request(app).post("/api/services").set(auth).send(body).expect(201);
  const res = await request(app).post("/api/services").set(auth).send(body).expect(400);
  assert.match(res.body.error, /slug/);
  assert.equal(await prisma.service.count({ where: { slug: "slug-duplicado" } }), 1);
});
