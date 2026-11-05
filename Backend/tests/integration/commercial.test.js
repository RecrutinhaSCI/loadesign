// Integração: fluxo comercial completo no PostgreSQL local "loadesign_test".
// Contatos → Orçamentos → Aprovação → Projetos → Financeiro → Agenda → Dashboard.
// Dados 100% sintéticos.
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, prisma, resetDatabase, createUser, todayBR } = require("../support/app");

let auth;
const api = {
  get: (url) => request(app).get(url).set(auth),
  post: (url, body = {}) => request(app).post(url).set(auth).send(body),
  patch: (url, body = {}) => request(app).patch(url).set(auth).send(body),
};

const TODAY = todayBR();
const NEXT_YEAR = Number(TODAY.slice(0, 4)) + 1;
const future = (mmdd) => `${NEXT_YEAR}-${mmdd}`;

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

async function newProposal(name, phone, extra = {}) {
  const res = await api.post("/api/proposals", {
    contact: { name, phone, type: "PROSPECT" },
    description: "Ideia sintética para teste",
    estimatedValue: "1500,00",
    ...extra,
  }).expect(201);
  return res.body.data;
}

// ─── Contatos ────────────────────────────────────────────────────────────────
test("contatos: cadastro, validação, duplicidade, busca, conversão e arquivamento", async (t) => {
  let prospect;

  await t.test("telefone obrigatório e válido; e-mail opcional e nunca inventado", async () => {
    await api.post("/api/contacts", { name: "Sem Telefone" }).expect(400);
    await api.post("/api/contacts", { name: "Tel Ruim", phone: "123" }).expect(400);
    await api.post("/api/contacts", { name: "Email Ruim", phone: "54911110000", email: "x@" }).expect(400);
    const res = await api.post("/api/contacts", { name: "Ana Prospect", phone: "(54) 91111-0001", source: "Instagram" }).expect(201);
    prospect = res.body.data;
    assert.equal(prospect.type, "PROSPECT");
    assert.equal(prospect.email, null);
    assert.equal(prospect.phoneNormalized, "54911110001");
  });

  await t.test("allowlist: campos internos enviados pelo cliente são ignorados", async () => {
    const res = await api.post("/api/contacts", {
      name: "Bruno Cliente", phone: "54911110002", email: "Bruno@Example.Test", type: "CLIENT",
      id: "id-forjado", convertedAt: "2020-01-01T00:00:00Z", legacyLeadId: "forjado", archivedAt: "2020-01-01T00:00:00Z",
    }).expect(201);
    assert.notEqual(res.body.data.id, "id-forjado");
    assert.equal(res.body.data.legacyLeadId, null);
    assert.equal(res.body.data.archivedAt, null);
    assert.equal(res.body.data.email, "bruno@example.test");
  });

  await t.test("telefone igual com outra máscara → 409 com candidatos; confirmação explícita cria", async () => {
    const dup = await api.post("/api/contacts", { name: "Ana Outra", phone: "+55 54 91111-0001" }).expect(409);
    assert.equal(dup.body.details.code, "DUPLICATE_CONTACT");
    assert.equal(dup.body.details.duplicates[0].id, prospect.id);
    assert.deepEqual(dup.body.details.duplicates[0].matchedBy, ["phone"]);
    const byEmail = await api.post("/api/contacts", { name: "Outro", phone: "54911119999", email: "bruno@example.test" }).expect(409);
    assert.deepEqual(byEmail.body.details.duplicates[0].matchedBy, ["email"]);
    await api.post("/api/contacts", { name: "Ana Homônima", phone: "54911110001", allowDuplicate: true }).expect(201);
    const check = await api.get("/api/contacts/duplicates?phone=54%2091111-0001").expect(200);
    assert.equal(check.body.data.length, 2);
  });

  await t.test("busca por nome, telefone e e-mail; filtro por tipo; paginação", async () => {
    assert.equal((await api.get("/api/contacts?search=bruno")).body.data.items.length, 1);
    assert.equal((await api.get("/api/contacts?search=91111-0002")).body.data.items.length, 1);
    assert.equal((await api.get("/api/contacts?search=example.test")).body.data.items.length, 1);
    const clients = (await api.get("/api/contacts?type=CLIENT")).body.data;
    assert.ok(clients.items.every((c) => c.type === "CLIENT"));
    const page = (await api.get("/api/contacts?pageSize=1&page=2")).body.data;
    assert.equal(page.items.length, 1);
    assert.equal(page.meta.pageSize, 1);
    assert.ok(page.meta.total >= 3);
  });

  await t.test("conversão Prospect → Cliente com data; segunda conversão → 409", async () => {
    const res = await api.post(`/api/contacts/${prospect.id}/convert`).expect(200);
    assert.equal(res.body.data.type, "CLIENT");
    assert.ok(res.body.data.convertedAt);
    await api.post(`/api/contacts/${prospect.id}/convert`).expect(409);
    const detail = (await api.get(`/api/contacts/${prospect.id}`)).body.data;
    assert.ok(detail.history.some((h) => h.action === "converted"));
    assert.ok(detail.possibleDuplicates.length >= 1, "homônimo com mesmo telefone é sinalizado");
  });

  await t.test("edição registra histórico; arquivado sai da listagem padrão", async () => {
    await api.patch(`/api/contacts/${prospect.id}`, { notes: "Prefere WhatsApp" }).expect(200);
    await api.post(`/api/contacts/${prospect.id}/archive`).expect(200);
    const list = (await api.get("/api/contacts?search=Ana Prospect")).body.data.items;
    assert.equal(list.length, 0);
    const archived = (await api.get("/api/contacts?archived=true")).body.data.items;
    assert.ok(archived.some((c) => c.id === prospect.id));
    await api.post("/api/proposals", { contactId: prospect.id, title: "X" }).expect(409);
    await api.post(`/api/contacts/${prospect.id}/unarchive`).expect(200);
  });
});

// ─── Orçamentos ──────────────────────────────────────────────────────────────
test("orçamentos: criação transacional, sem receita, histórico e edição", async (t) => {
  let proposal;

  await t.test("novo contato + orçamento numa operação; nada financeiro é gerado", async () => {
    const before = { tx: await prisma.transaction.count(), rec: await prisma.receivable.count() };
    proposal = await newProposal("Carla Nova", "54922220001");
    assert.equal(proposal.status, "PENDING");
    assert.equal(proposal.estimatedValue, 1500);
    assert.equal(proposal.contact.type, "PROSPECT");
    assert.equal(proposal.contactPhone, "54922220001");
    assert.equal(await prisma.transaction.count(), before.tx);
    assert.equal(await prisma.receivable.count(), before.rec);
    const c = await prisma.contact.findUnique({ where: { id: proposal.contactId } });
    assert.equal(c.name, "Carla Nova");
  });

  await t.test("telefone de contato existente → 409 (nada criado); contato existente por id funciona", async () => {
    const count = await prisma.proposal.count();
    const res = await api.post("/api/proposals", { contact: { name: "Carla", phone: "(54) 92222-0001" } }).expect(409);
    assert.equal(res.body.details.code, "DUPLICATE_CONTACT");
    assert.equal(await prisma.proposal.count(), count);
    const ok = await api.post("/api/proposals", { contactId: proposal.contactId, title: "Segundo orçamento" }).expect(201);
    assert.equal(ok.body.data.estimatedValue, null);
  });

  await t.test("clique repetido não duplica o orçamento", async () => {
    const body = { contactId: proposal.contactId, title: "Clique duplo" };
    await api.post("/api/proposals", body).expect(201);
    await api.post("/api/proposals", body).expect(409);
    assert.equal(await prisma.proposal.count({ where: { title: "Clique duplo" } }), 1);
  });

  await t.test("serviço opcional vinculado ao pacote; erro se pacote não existe", async () => {
    const svc = await prisma.service.create({ data: { name: "Pacote Sintético", slug: "pacote-sint", description: "d", price: 900 } });
    const res = await api.post("/api/proposals", { contactId: proposal.contactId, serviceId: svc.id }).expect(201);
    assert.equal(res.body.data.serviceName, "Pacote Sintético");
    assert.match(res.body.data.title, /Pacote Sintético/);
    await api.post("/api/proposals", { contactId: proposal.contactId, serviceId: "nao-existe" }).expect(400);
  });

  await t.test("edição só enquanto pendente, com histórico de alterações", async () => {
    await api.patch(`/api/proposals/${proposal.id}`, { estimatedValue: 1800 }).expect(200);
    const detail = (await api.get(`/api/proposals/${proposal.id}`)).body.data;
    assert.equal(detail.estimatedValue, 1800);
    const upd = detail.history.find((h) => h.action === "updated");
    assert.deepEqual(upd.data.estimatedValue, { from: "1500.00", to: "1800.00" });
  });

  await t.test("listagem com contagem por status e busca", async () => {
    const res = (await api.get("/api/proposals?status=PENDING&search=carla")).body.data;
    assert.ok(res.items.length >= 1);
    assert.ok(res.counts.PENDING >= 1);
  });
});

// ─── Aprovação, recusa, reabertura ───────────────────────────────────────────
test("aprovação à vista: oficializa projeto, converte prospect e gera 1 cobrança", async () => {
  const p = await newProposal("Diego Avista", "54933330001");
  const txBefore = await prisma.transaction.count();
  const res = await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Identidade visual", finalValue: "2000,00",
    payment: { mode: "ONE_TIME", dueDate: future("03-10"), method: "PIX" },
  }).expect(201);
  const project = res.body.data;
  assert.equal(project.contractedValue, 2000);
  assert.equal(project.paymentMode, "ONE_TIME");
  assert.equal(project.proposalId, p.id);
  assert.equal(project.startDate, null, "sem datas inventadas");
  assert.equal(project.dueDate, null);
  assert.equal(project.receivables.length, 1);
  assert.equal(project.receivables[0].amount, 2000);
  assert.equal(project.receivables[0].dueDate, future("03-10"));
  assert.equal(project.receivables[0].status, "PENDING");
  assert.equal(project.contact.type, "CLIENT");
  assert.ok(project.contact.convertedAt);

  const original = await prisma.proposal.findUnique({ where: { id: p.id } });
  assert.equal(original.status, "APPROVED");
  assert.equal(original.estimatedValue.toFixed(2), "1500.00", "valor estimado original preservado");
  assert.equal(await prisma.transaction.count(), txBefore, "aprovação não gera receita");

  await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "x", finalValue: 1, payment: { mode: "ONE_TIME", dueDate: future("03-10") },
  }).expect(409);
  await api.patch(`/api/proposals/${p.id}`, { title: "não pode" }).expect(409);
  assert.equal(await prisma.workProject.count({ where: { proposalId: p.id } }), 1);
});

test("aprovações simultâneas: exatamente um projeto", async () => {
  const p = await newProposal("Elisa Corrida", "54933330002");
  const body = { serviceName: "Social media", finalValue: 500, payment: { mode: "ONE_TIME", dueDate: future("04-01") } };
  const results = await Promise.all([1, 2, 3].map(() => api.post(`/api/proposals/${p.id}/approve`, body)));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409, 409]);
  assert.equal(await prisma.workProject.count({ where: { proposalId: p.id } }), 1);
  assert.equal(await prisma.receivable.count({ where: { project: { proposalId: p.id } } }), 1);
});

test("validação da aprovação: serviço, valor e modalidade obrigatórios; nada criado em erro", async () => {
  const p = await newProposal("Fabio Valida", "54933330003");
  await api.post(`/api/proposals/${p.id}/approve`, { finalValue: 100, payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(400);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(400);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", finalValue: 100, payment: { mode: "BOLETAO" } }).expect(400);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", finalValue: 100, payment: { mode: "ONE_TIME" } }).expect(400);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", finalValue: 100, startDate: future("05-10"), dueDate: future("05-01"), payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(400);
  const fresh = await prisma.proposal.findUnique({ where: { id: p.id } });
  assert.equal(fresh.status, "PENDING");
  assert.equal(await prisma.workProject.count({ where: { proposalId: p.id } }), 0);
  const contact = await prisma.contact.findUnique({ where: { id: p.contactId } });
  assert.equal(contact.type, "PROSPECT", "erro não converte o contato");
});

test("recusa → reabertura → aprovação, com rastreabilidade; cancelado não aprova", async () => {
  const p = await newProposal("Gabi Recusa", "54933330004");
  await api.post(`/api/proposals/${p.id}/reject`, { reason: "Preço acima do orçamento" }).expect(200);
  await api.post(`/api/proposals/${p.id}/reject`).expect(409);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", finalValue: 1, payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(409);
  const reopened = (await api.post(`/api/proposals/${p.id}/reopen`, { reason: "Cliente voltou a negociar" }).expect(200)).body.data;
  assert.equal(reopened.status, "PENDING");
  assert.equal(reopened.rejectionReason, null);
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "S", finalValue: 300, payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(201);
  const history = (await api.get(`/api/proposals/${p.id}`)).body.data.history.map((h) => h.action);
  for (const a of ["created", "rejected", "reopened", "approved"]) assert.ok(history.includes(a), a);

  const c = await newProposal("Hugo Cancela", "54933330005");
  await api.post(`/api/proposals/${c.id}/cancel`, { reason: "Desistiu" }).expect(200);
  await api.post(`/api/proposals/${c.id}/reopen`).expect(409);
  await api.post(`/api/proposals/${c.id}/approve`, { serviceName: "S", finalValue: 1, payment: { mode: "ONE_TIME", dueDate: future("01-10") } }).expect(409);
});

// ─── Parcelamento ────────────────────────────────────────────────────────────
test("parcelado: centavos corretos, soma exata e vencimentos em meses curtos", async () => {
  const p = await newProposal("Igor Parcela", "54944440001");
  const project = (await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Site", finalValue: "1000,00",
    payment: { mode: "INSTALLMENTS", count: 3, firstDueDate: future("01-31"), method: "BOLETO" },
  }).expect(201)).body.data;
  const r = project.receivables;
  assert.deepEqual(r.map((x) => x.amount), [333.34, 333.33, 333.33]);
  assert.deepEqual(r.map((x) => x.dueDate), [future("01-31"), `${NEXT_YEAR}-02-${NEXT_YEAR % 4 === 0 ? 29 : 28}`, future("03-31")]);
  assert.deepEqual(r.map((x) => `${x.installmentNumber}/${x.installmentCount}`), ["1/3", "2/3", "3/3"]);
  const sum = await prisma.receivable.aggregate({ where: { projectId: project.id }, _sum: { amount: true } });
  assert.equal(sum._sum.amount.toFixed(2), "1000.00");

  const p2 = await newProposal("Julia Datas", "54944440002");
  const custom = (await api.post(`/api/proposals/${p2.id}/approve`, {
    serviceName: "Site", finalValue: 100,
    payment: { mode: "INSTALLMENTS", count: 2, firstDueDate: future("02-01"), dueDates: [future("02-01"), future("02-20")] },
  }).expect(201)).body.data;
  assert.deepEqual(custom.receivables.map((x) => x.dueDate), [future("02-01"), future("02-20")]);
  const p3 = await newProposal("Kaio Ordem", "54944440003");
  await api.post(`/api/proposals/${p3.id}/approve`, {
    serviceName: "Site", finalValue: 100,
    payment: { mode: "INSTALLMENTS", count: 2, firstDueDate: future("02-01"), dueDates: [future("03-01"), future("02-01")] },
  }).expect(400);
  await api.post(`/api/proposals/${p3.id}/approve`, {
    serviceName: "Site", finalValue: 100, payment: { mode: "INSTALLMENTS", count: 1, firstDueDate: future("02-01") },
  }).expect(400);
});

// ─── Mensalidades ────────────────────────────────────────────────────────────
test("mensalidade: geração sob demanda sem duplicar, dia 31, pausa e encerramento", async () => {
  const p = await newProposal("Lia Mensal", "54955550001");
  const project = (await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Gestão de redes", finalValue: "450,00",
    payment: { mode: "RECURRING", dueDay: 31, startDate: future("01-15"), method: "PIX" },
  }).expect(201)).body.data;
  assert.equal(project.paymentMode, "RECURRING");
  assert.equal(project.recurring.dueDay, 31);
  assert.equal(project.receivables.length, 1, "por padrão gera só o primeiro mês");
  assert.equal(project.receivables[0].dueDate, future("01-31"));
  const recId = project.recurring.id;

  const gen = (await api.post(`/api/recurring/${recId}/generate`, { until: future("04") }).expect(200)).body.data;
  assert.equal(gen.created, 3);
  assert.equal(gen.skipped, 1);
  const again = (await api.post(`/api/recurring/${recId}/generate`, { until: future("04") }).expect(200)).body.data;
  assert.equal(again.created, 0, "geração repetida não duplica");
  const parallel = await Promise.all([1, 2].map(() => api.post(`/api/recurring/${recId}/generate`, { until: future("05") })));
  assert.equal(parallel.map((r) => r.body.data.created).reduce((a, b) => a + b, 0), 1);

  const dues = (await prisma.receivable.findMany({ where: { recurringId: recId }, orderBy: { dueDate: "asc" } }))
    .map((r) => r.dueDate.toISOString().slice(0, 10));
  assert.deepEqual(dues, [future("01-31"), `${NEXT_YEAR}-02-${NEXT_YEAR % 4 === 0 ? 29 : 28}`, future("03-31"), future("04-30"), future("05-31")]);

  await api.post(`/api/recurring/${recId}/generate`, { until: `${NEXT_YEAR + 5}-01` }).expect(400);
  await api.post(`/api/recurring/${recId}/pause`).expect(200);
  await api.post(`/api/recurring/${recId}/generate`, { until: future("06") }).expect(409);
  await api.post(`/api/recurring/${recId}/resume`).expect(200);
  const ended = (await api.post(`/api/recurring/${recId}/end`).expect(200)).body.data;
  assert.equal(ended.agreement.status, "ENDED");
  assert.equal(ended.cancelledCharges, 5, "cobranças futuras pendentes canceladas");
  await api.post(`/api/recurring/${recId}/resume`).expect(409);
  assert.equal(await prisma.receivable.count({ where: { recurringId: recId } }), 5, "nada apagado");
});

// ─── Recebimentos ────────────────────────────────────────────────────────────
test("baixa: atômica com lançamento, sem baixa dupla; estorno e cancelamento com histórico", async () => {
  const p = await newProposal("Mara Paga", "54966660001");
  const project = (await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Ensaio", finalValue: "900,00", payment: { mode: "INSTALLMENTS", count: 3, firstDueDate: future("06-10") },
  }).expect(201)).body.data;
  const [r1, r2, r3] = project.receivables;

  const summaryBefore = (await api.get("/api/receivables/summary")).body.data;

  await api.post(`/api/receivables/${r1.id}/receive`, {}).expect(400); // forma de pagamento obrigatória
  await api.post(`/api/receivables/${r1.id}/receive`, { method: "PIX", receivedAt: future("12-31") }).expect(400); // data futura
  const results = await Promise.all([1, 2].map(() => api.post(`/api/receivables/${r1.id}/receive`, { method: "PIX" })));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const received = results.find((r) => r.status === 200).body.data;
  assert.equal(received.status, "RECEIVED");
  assert.equal(received.receivedAt, TODAY);
  assert.equal(received.receivedAmount, 300);
  assert.ok(received.transactionId);
  const tx = await prisma.transaction.findUnique({ where: { id: received.transactionId } });
  assert.equal(tx.type, "income");
  assert.equal(tx.value, 300);
  assert.equal(await prisma.transaction.count({ where: { description: r1.description } }), 1, "um único lançamento");

  const summary = (await api.get("/api/receivables/summary")).body.data;
  assert.equal(Math.round((summary.received.amount - summaryBefore.received.amount) * 100), 30000);
  assert.equal(Math.round((summaryBefore.pending.amount - summary.pending.amount) * 100), 30000);

  await api.post(`/api/receivables/${r1.id}/cancel`, { reason: "teste" }).expect(409);
  await api.post(`/api/receivables/${r1.id}/reverse`, {}).expect(400);
  const reversed = (await api.post(`/api/receivables/${r1.id}/reverse`, { reason: "PIX devolvido" }).expect(200)).body.data;
  assert.equal(reversed.status, "PENDING");
  assert.equal(reversed.transactionId, null);
  assert.equal(await prisma.transaction.count({ where: { id: received.transactionId } }), 1, "lançamento original preservado");
  assert.equal(await prisma.transaction.count({ where: { category: "Estorno de recebimento", description: `Estorno: ${r1.description}` } }), 1);
  await api.post(`/api/receivables/${r1.id}/reverse`, { reason: "de novo" }).expect(409);

  await api.patch(`/api/receivables/${r2.id}`, { dueDate: future("07-15") }).expect(200);
  await api.post(`/api/receivables/${r2.id}/cancel`, { reason: "Negociado desconto" }).expect(200);
  await api.post(`/api/receivables/${r2.id}/receive`, { method: "CASH" }).expect(409);
  const hist = (await api.get(`/api/receivables/${r2.id}`)).body.data.history.map((h) => h.action);
  assert.deepEqual(hist.sort(), ["cancelled", "rescheduled"]);

  await api.post(`/api/receivables/${r3.id}/receive`, { method: "CARD", receivedAmount: "295,50", notes: "Taxa da maquininha" }).expect(200);
  const r3db = await prisma.receivable.findUnique({ where: { id: r3.id } });
  assert.equal(r3db.receivedAmount.toFixed(2), "295.50");
  assert.equal(r3db.amount.toFixed(2), "300.00");

  const list = (await api.get(`/api/receivables?projectId=${project.id}&status=RECEIVED`)).body.data;
  assert.equal(list.items.length, 1);
  assert.equal(list.totals.receivedAmount, 295.5);
});

test("cobranças vencidas aparecem como OVERDUE e nunca como receita", async () => {
  const p = await newProposal("Nina Atraso", "54966660002");
  const pastDate = `${Number(TODAY.slice(0, 4)) - 1}-01-10`;
  await api.post(`/api/proposals/${p.id}/approve`, { serviceName: "Logo", finalValue: 700, payment: { mode: "ONE_TIME", dueDate: pastDate } }).expect(201);
  const overdue = (await api.get("/api/receivables?status=OVERDUE&search=Nina")).body.data;
  assert.equal(overdue.items.length, 1);
  assert.equal(overdue.items[0].status, "PENDING");
  const s = (await api.get("/api/receivables/summary")).body.data;
  assert.ok(s.overdue.count >= 1);
  assert.ok(s.overdue.amount >= 700);
});

// ─── Projetos ────────────────────────────────────────────────────────────────
test("projetos: status, datas opcionais, cancelamento preserva recebidos", async () => {
  const p = await newProposal("Otto Projeto", "54977770001");
  const project = (await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Site", finalValue: 1200, payment: { mode: "INSTALLMENTS", count: 2, firstDueDate: future("08-05") },
  }).expect(201)).body.data;

  const list = (await api.get("/api/work-projects?status=ACTIVE&search=Otto")).body.data;
  assert.equal(list.items.length, 1);
  assert.deepEqual(list.items[0].finance, { pending: 1200, received: 0 });

  await api.patch(`/api/work-projects/${project.id}`, { startDate: future("08-01"), dueDate: future("07-01") }).expect(400);
  const upd = (await api.patch(`/api/work-projects/${project.id}`, { status: "IN_PROGRESS", dueDate: future("09-30"), contractedValue: 1 }).expect(200)).body.data;
  assert.equal(upd.status, "IN_PROGRESS");
  assert.equal(upd.dueDate, future("09-30"));
  assert.equal(upd.contractedValue, 1200, "valor contratado não é editável por PATCH");

  await api.post(`/api/receivables/${project.receivables[0].id}/receive`, { method: "PIX" }).expect(200);
  await api.post(`/api/work-projects/${project.id}/cancel`, {}).expect(400);
  const cancelled = (await api.post(`/api/work-projects/${project.id}/cancel`, { reason: "Cliente desistiu" }).expect(200)).body.data;
  assert.equal(cancelled.status, "CANCELLED");
  const statuses = cancelled.receivables.map((r) => r.status).sort();
  assert.deepEqual(statuses, ["CANCELLED", "RECEIVED"]);
  await api.patch(`/api/work-projects/${project.id}`, { status: "DONE" }).expect(409);
  assert.ok(cancelled.history.some((h) => h.action === "cancelled"));
});

// ─── Agenda ──────────────────────────────────────────────────────────────────
test("agenda: eventos com fuso de Brasília, itens derivados reais, filtros e cancelamento", async () => {
  const p = await newProposal("Paula Agenda", "54988880001");
  const project = (await api.post(`/api/proposals/${p.id}/approve`, {
    serviceName: "Ensaio", finalValue: 400, dueDate: future("10-20"), payment: { mode: "ONE_TIME", dueDate: future("10-15") },
  }).expect(201)).body.data;

  await api.post("/api/calendar", { title: "Sem data" }).expect(400);
  await api.post("/api/calendar", { title: "Datas invertidas", startsAt: `${future("10-10")}T15:00:00-03:00`, endsAt: `${future("10-10")}T14:00:00-03:00` }).expect(400);
  await api.post("/api/calendar", { title: "Projeto falso", startsAt: `${future("10-10")}T15:00:00-03:00`, projectId: "nao-existe" }).expect(400);

  const ev = (await api.post("/api/calendar", {
    title: "Reunião de briefing", type: "MEETING", startsAt: `${future("10-10")}T21:30:00-03:00`,
    endsAt: `${future("10-10")}T22:30:00-03:00`, contactId: project.contactId, projectId: project.id,
  }).expect(201)).body.data;
  assert.equal(ev.startsAt, `${future("10-11")}T00:30:00.000Z`, "gravado em UTC");

  const month = (await api.get(`/api/calendar?from=${future("10-01")}T00:00:00-03:00&to=${future("11-01")}T00:00:00-03:00`)).body.data;
  assert.ok(month.events.some((e) => e.id === ev.id));
  const kinds = month.derived.map((d) => d.kind);
  assert.ok(kinds.includes("PAYMENT_DUE"));
  assert.ok(kinds.includes("PROJECT_DUE"));
  assert.ok(month.derived.some((d) => d.date === future("10-15") && d.amount === 400));

  const meetings = (await api.get(`/api/calendar?from=${future("10-01")}T00:00:00-03:00&to=${future("11-01")}T00:00:00-03:00&type=DELIVERY`)).body.data;
  assert.equal(meetings.events.length, 0);
  assert.equal(meetings.derived.length, 0);

  await api.patch(`/api/calendar/${ev.id}`, { status: "CANCELLED" }).expect(200);
  const after = (await api.get(`/api/calendar?from=${future("10-01")}T00:00:00-03:00&to=${future("11-01")}T00:00:00-03:00`)).body.data;
  assert.ok(!after.events.some((e) => e.id === ev.id), "cancelado sai da visão padrão");
  const all = (await api.get(`/api/calendar?from=${future("10-01")}T00:00:00-03:00&to=${future("11-01")}T00:00:00-03:00&status=CANCELLED`)).body.data;
  assert.ok(all.events.some((e) => e.id === ev.id));

  await api.get(`/api/calendar?from=${future("01-01")}T00:00:00Z&to=${future("12-31")}T00:00:00Z`).expect(400);
  assert.equal(await prisma.calendarEvent.count({ where: { projectId: project.id, status: { not: "CANCELLED" } } }), 0, "nenhum evento automático");
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
test("dashboard: métricas reais e coerentes com o banco", async () => {
  const d = (await api.get("/api/dashboard").expect(200)).body.data;
  const [clients, prospects, pending, approved, active, received, pendingSum] = await Promise.all([
    prisma.contact.count({ where: { type: "CLIENT", archivedAt: null } }),
    prisma.contact.count({ where: { type: "PROSPECT", archivedAt: null } }),
    prisma.proposal.count({ where: { status: "PENDING" } }),
    prisma.proposal.count({ where: { status: "APPROVED" } }),
    prisma.workProject.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] } } }),
    prisma.receivable.aggregate({ where: { status: "RECEIVED" }, _sum: { receivedAmount: true } }),
    prisma.receivable.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
  ]);
  assert.equal(d.contacts.clients, clients);
  assert.equal(d.contacts.prospects, prospects);
  assert.equal(d.contacts.total, clients + prospects);
  assert.equal(d.proposals.pending, pending);
  assert.equal(d.proposals.approved, approved);
  assert.equal(d.projects.active, active);
  assert.equal(d.finance.received.amount, Number(received._sum.receivedAmount.toFixed(2)));
  assert.equal(d.finance.pending.amount, Number(pendingSum._sum.amount.toFixed(2)));
  assert.ok(d.finance.estimated.amount >= 0);
  assert.ok(Array.isArray(d.activity) && d.activity.length > 0);
  assert.ok(Array.isArray(d.upcoming.events));
});

// ─── Reconciliação de legados (somente dados sintéticos) ─────────────────────
test("importação de leads/clients legados: prévia, conflitos e idempotência", async () => {
  await prisma.client.create({ data: { name: "Rita Legada", email: "rita@example.test", phone: "(54) 90000-1001" } });
  await prisma.lead.create({ data: { name: "rita legada", email: "5490000@whatsapp.local", phone: "54900001001", source: "social" } });
  await prisma.lead.create({ data: { name: "Saulo Lead", email: "saulo@example.test", phone: "54900001002" } });
  await prisma.lead.create({ data: { name: "Tania A", email: "a@example.test", phone: "54900001003" } });
  await prisma.lead.create({ data: { name: "Tania B", email: "b@example.test", phone: "54900001003" } });
  await prisma.lead.create({ data: { name: "Sem Fone", email: "semfone@example.test" } });
  const leadsBefore = await prisma.lead.count();

  await api.post("/api/contacts/legacy-import", {}).expect(400);
  const preview = (await api.get("/api/contacts/legacy-import").expect(200)).body.data;
  assert.equal(preview.summary.ready, 2);
  assert.equal(preview.summary.conflicts, 1);
  assert.equal(preview.summary.withoutPhone, 1);

  const applied = (await api.post("/api/contacts/legacy-import", { confirm: true }).expect(200)).body.data;
  assert.equal(applied.created, 2);
  const rita = await prisma.contact.findFirst({ where: { phoneNormalized: "54900001001" } });
  assert.equal(rita.type, "CLIENT");
  assert.equal(rita.email, "rita@example.test");
  assert.ok(rita.legacyClientId && rita.legacyLeadId);
  const saulo = await prisma.contact.findFirst({ where: { phoneNormalized: "54900001002" } });
  assert.equal(saulo.type, "PROSPECT");

  const again = (await api.post("/api/contacts/legacy-import", { confirm: true }).expect(200)).body.data;
  assert.equal(again.created, 0, "idempotente");
  assert.equal(again.summary.alreadyImported, 3);
  assert.equal(await prisma.lead.count(), leadsBefore, "legado intacto");
});

// ─── Regressão ───────────────────────────────────────────────────────────────
test("regressão: rotas legadas continuam respondendo com o fluxo novo ativo", async () => {
  for (const url of ["/api/clients", "/api/leads", "/api/quotes", "/api/projects", "/api/transactions", "/api/services"]) {
    await api.get(url).expect(200);
  }
  const tx = (await api.get("/api/transactions")).body.data;
  assert.ok(tx.some((t) => t.category === "Recebimentos"), "baixas aparecem no financeiro legado");
});
