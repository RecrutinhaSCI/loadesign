// Integração: endpoints públicos e tratamento de erros HTTP.
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, prisma, resetDatabase, createUser } = require("../support/app");

test.before(async () => {
  await resetDatabase();
});
test.after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

test("GET /api/health → 200 online", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.equal(res.body.status, "online");
});

test("formulário de contato cria ContactMessage + Lead vinculados", async () => {
  const res = await request(app).post("/api/contact").send({
    name: "  Visitante Sintético ",
    phone: "(54) 90000-0002",
    email: "VISITANTE@Example.Test",
    instagram: "@perfil_ficticio",
    service: "Pacote Teste",
    message: " Mensagem fictícia de teste. ",
  }).expect(201);

  const msg = await prisma.contactMessage.findUnique({ where: { id: res.body.data.id } });
  const lead = await prisma.lead.findUnique({ where: { id: res.body.data.leadId } });
  assert.equal(msg.leadId, lead.id);
  assert.equal(msg.name, "Visitante Sintético");
  assert.equal(msg.email, "visitante@example.test");
  assert.equal(msg.message, "Mensagem fictícia de teste.");
  assert.equal(msg.status, "NEW");
  assert.equal(lead.status, "new");
  assert.equal(lead.source, "social");
  assert.equal(lead.website, "https://instagram.com/perfil_ficticio");
  assert.deepEqual(JSON.parse(lead.tags), ["site"]);
});

test("formulário de contato sem e-mail usa e-mail técnico derivado do telefone", async () => {
  const res = await request(app).post("/api/contact")
    .send({ name: "Sem Email", phone: "54 90000-0003", message: "Oi" }).expect(201);
  const lead = await prisma.lead.findUnique({ where: { id: res.body.data.leadId } });
  assert.equal(lead.email, "54900000003@whatsapp.local");
  const msg = await prisma.contactMessage.findUnique({ where: { id: res.body.data.id } });
  assert.equal(msg.email, null);
});

test("formulário de contato incompleto → 400 e nada persistido", async () => {
  const before = await prisma.contactMessage.count();
  for (const body of [{}, { name: "x", phone: "1" }, { name: "x", message: "y" }, { phone: "1", message: "y" }]) {
    const res = await request(app).post("/api/contact").send(body).expect(400);
    assert.equal(res.body.success, false);
  }
  assert.equal(await prisma.contactMessage.count(), before);
});

test("serviços públicos: só ativos e SEM preço interno", async () => {
  await prisma.service.createMany({
    data: [
      { name: "Ativo", slug: "pub-ativo", description: "d", price: 1234.56, active: true, items: JSON.stringify(["x"]) },
      { name: "Inativo", slug: "pub-inativo", description: "d", price: 99, active: false },
    ],
  });
  const res = await request(app).get("/api/services/public").expect(200);
  const slugs = res.body.data.map((s) => s.slug);
  assert.ok(slugs.includes("pub-ativo"));
  assert.ok(!slugs.includes("pub-inativo"));
  for (const s of res.body.data) {
    assert.equal("price" in s, false, `serviço ${s.slug} expõe price`);
  }
  assert.ok(!JSON.stringify(res.body).includes("1234.56"));
  assert.deepEqual(res.body.data.find((s) => s.slug === "pub-ativo").items, ["x"]);
});

test("configurações públicas: GET cria singleton com defaults", async () => {
  const res = await request(app).get("/api/settings").expect(200);
  assert.equal(res.body.data.id, "singleton");
  assert.equal(typeof res.body.data.notifications, "object");
  assert.ok(await prisma.agencySettings.findUnique({ where: { id: "singleton" } }));
});

test("depoimentos e portfólio: leitura pública", async () => {
  await request(app).get("/api/testimonials").expect(200);
  await request(app).get("/api/portfolio").expect(200);
});

test("rota inexistente → 404 JSON", async () => {
  const res = await request(app).get("/api/nao-existe").expect(404);
  assert.equal(res.body.success, false);
});

test("respostas de erro não vazam stack trace fora de desenvolvimento", async () => {
  const res = await request(app).get("/api/clients/qualquer").expect(401);
  assert.equal(res.body.stack, undefined);
});

test("JSON malformado → 400 e nada persistido", async () => {
  const before = await prisma.contactMessage.count();
  const res = await request(app).post("/api/contact").set("Content-Type", "application/json").send("{ invalido").expect(400);
  assert.equal(res.body.success, false);
  assert.equal(await prisma.contactMessage.count(), before);
});

test("campo desconhecido ou data inválida no payload → 400 sem detalhes internos", async () => {
  const u = await createUser();
  const t = (await request(app).post("/api/auth/login").send({ email: u.email, password: u.password })).body.data.tokens.accessToken;
  await request(app).post("/api/clients").set("Authorization", `Bearer ${t}`)
    .send({ name: "x", email: "x@example.test", phone: "1", campoInexistente: true }).expect(400);
  const r2 = await request(app).post("/api/quotes").set("Authorization", `Bearer ${t}`)
    .send({ clientName: "x", validUntil: "data-invalida" }).expect(400);
  assert.doesNotMatch(JSON.stringify(r2.body), /prisma|invocation/i);
  assert.equal(await prisma.client.count({ where: { email: "x@example.test" } }), 0);
});
