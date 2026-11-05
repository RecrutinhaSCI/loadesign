// prisma/seed.demo.js
// ─────────────────────────────────────────────────────────────────────────────
// SEED DE DEMONSTRAÇÃO — DESTRUTIVO — SOMENTE BANCO LOCAL DESCARTÁVEL
//
// Popula um banco local com dados FICTÍCIOS (clientes, leads, projetos,
// orçamentos, transações, depoimentos, portfólio).
// Pode APAGAR dados (deleteMany) quando o banco está vazio de clientes ou com
// SEED_RESET=true.
//
// Não está ligado a nenhum script npm nem ao "prisma db seed" — de propósito.
// Execução manual, consciente:
//
//   DEMO_SEED_CONFIRM_DB=<nome_do_banco_local> \
//   DEMO_ADMIN_PASSWORD=<senha_local_de_teste> \
//   node prisma/seed.demo.js
//
// Travas:
//   1) DATABASE_URL precisa ser local/aprovada (guard, sempre aplicado).
//   2) DEMO_SEED_CONFIRM_DB precisa ser igual ao nome do banco da DATABASE_URL.
//   3) Senha do admin de demo vem de DEMO_ADMIN_PASSWORD (sem senha fixa) e
//      nunca é impressa. Admin existente NÃO tem a senha redefinida.
//   4) Pacotes e AgencySettings só são criados se não existirem (sem update).
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { assertSafeDatabaseEnv, parseDatabaseTarget } = require("../src/config/dbGuard");

function fail(msg) {
  console.error(`[SEED DEMO] ${msg}`);
  process.exit(1);
}

try {
  assertSafeDatabaseEnv(process.env, { alwaysEnforce: true });
} catch (err) {
  fail(err.message);
}

const target = parseDatabaseTarget(process.env.DATABASE_URL);
const confirmDb = String(process.env.DEMO_SEED_CONFIRM_DB || "").trim();
if (!target || !target.database || confirmDb !== target.database) {
  fail(
    "Confirmação ausente. Defina DEMO_SEED_CONFIRM_DB com o nome exato do banco " +
    "local de destino para autorizar este seed destrutivo."
  );
}

const DEMO_ADMIN_EMAIL = String(process.env.DEMO_ADMIN_EMAIL || "admin@demo.local").trim().toLowerCase();
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "";
if (DEMO_ADMIN_PASSWORD.length < 8) {
  fail("Defina DEMO_ADMIN_PASSWORD (mínimo 8 caracteres) para o admin de demonstração.");
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log(`🌱 Seed de DEMONSTRAÇÃO em ${target.description}...`);

  // ── 1) Admin de demo (somente cria; nunca redefine senha existente) ─────────
  const existingAdmin = await prisma.user.findUnique({ where: { email: DEMO_ADMIN_EMAIL } });
  if (existingAdmin) {
    console.log(`ℹ️  Admin ${DEMO_ADMIN_EMAIL} já existe — mantido sem alterações.`);
  } else {
    await prisma.user.create({
      data: {
        name: "Loa (demo)",
        email: DEMO_ADMIN_EMAIL,
        password: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10),
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✅ Admin de demo criado: ${DEMO_ADMIN_EMAIL} (senha definida via DEMO_ADMIN_PASSWORD).`);
  }

  // ── 2) AgencySettings (singleton) ──────────────────────────────────────────
  await prisma.agencySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Loa Design",
      email: "loadesigndigital@gmail.com",
      whatsapp: "555499481393",
      instagram: "@loadesigndigital",
      website: "https://loadesign.com.br",
      ownerName: "Loa",
      ownerEmail: "loadesigndigital@gmail.com",
    },
  });
  console.log("✅ AgencySettings criadas.");

  // ── 3) Services / Pacotes oficiais Loa Design ──────────────────────────────
  // Pacotes de referência. Só são CRIADOS se o slug não existir —
  // nunca sobrescreve preço/texto de pacotes já cadastrados.
  const services = [
    {
      slug: "basico",
      name: "Pacote Básico",
      price: 250,
      featured: false,
      description:
        "Indicado para negócios que estão iniciando sua presença digital e precisam de uma comunicação visual organizada e profissional.",
      items: [
        "2 vídeos curtos (Reels) com edição simples por mês",
        "3 posts de imagem para o feed por mês",
        "Conteúdo adaptado à identidade do seu negócio",
      ],
    },
    {
      slug: "intermediario",
      name: "Pacote Intermediário",
      price: 450,
      featured: true,
      description:
        "Indicado para negócios que já possuem presença digital e buscam mais consistência, engajamento e profissionalismo nas redes sociais.",
      items: [
        "4 vídeos curtos (Reels) com edição simples por mês",
        "5 posts de feed por mês",
        "Conteúdo adaptado à identidade do seu negócio",
      ],
    },
    {
      slug: "avancado",
      name: "Pacote Avançado",
      price: 900,
      featured: false,
      description:
        "Indicado para negócios que buscam crescimento, posicionamento e maior impacto no digital.",
      items: [
        "6 vídeos curtos (Reels) com edição simples por mês",
        "10 posts de imagens para o feed por mês",
        "Conteúdo adaptado à identidade do seu negócio",
      ],
    },
    {
      slug: "premium",
      name: "Pacote Premium",
      price: 1100,
      featured: false,
      description:
        "Indicado para negócios que desejam delegar a presença digital a uma equipe especializada, mantendo suas redes sociais ativas, organizadas e com acompanhamento constante.",
      items: [
        "6 vídeos curtos (Reels) com edição simples por mês",
        "10 posts de feed por mês",
        "5 fotos de stories",
        "Gestão de rede",
        "Conteúdo adaptado à identidade do seu negócio",
      ],
    },
  ];

  // Create-only: `update: {}` garante que pacotes existentes não são alterados.
  for (const s of services) {
    const itemsJson = JSON.stringify(s.items);
    const fields = {
      name: s.name,
      price: s.price,
      featured: s.featured,
      description: s.description,
      items: itemsJson,
    };
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},                           // nunca altera pacote existente
      create: { ...fields, slug: s.slug, active: true },
    });
  }
  console.log(`✅ ${services.length} pacotes verificados (criados apenas se ausentes).`);

  // ── 4) Dados de demonstração (somente primeira execução) ───────────────────
  // Banco local descartável apenas (ver travas no topo do arquivo).
  // Para forçar reset completo: SEED_RESET=true node prisma/seed.demo.js
  const existingClients = await prisma.client.count();
  const force = process.env.SEED_RESET === "true";

  if (existingClients > 0 && !force) {
    console.log(`ℹ️  Banco já tem ${existingClients} cliente(s). Pulando seed de demo.`);
    console.log("   Use SEED_RESET=true node prisma/seed.demo.js para forçar reset.");
    console.log("\n🎉 Seed concluído (apenas admin + settings + services).");
    return;
  }

  if (force) {
    console.log("⚠️  SEED_RESET=true — apagando dados de demo antes de recriar.");
  }

  // ── 4) Clients ─────────────────────────────────────────────────────────────
  await prisma.client.deleteMany({});
  const clients = await prisma.$transaction([
    prisma.client.create({ data: {
      name: "Bruna Tavares", email: "bruna@nuteatelie.com", phone: "(48) 99987-4421",
      company: "Nutê Ateliê de Joias", instagram: "@nuteatelie",
      notes: "Pacote Avançado anual. Aniversário em 14/09.",
      totalProjects: 6, totalRevenue: 5100,
    } }),
    prisma.client.create({ data: {
      name: "Camila Rocha", email: "camila@studio.com", phone: "(54) 99876-5544",
      company: "Studio Camila Rocha", instagram: "@camilarocha.foto",
      notes: "Cresceu 220% no Insta nos últimos 4 meses.",
      totalProjects: 4, totalRevenue: 1800,
    } }),
    prisma.client.create({ data: {
      name: "Mariana Costa", email: "contato@coachmari.com.br", phone: "(54) 99812-7744",
      company: "Coach Mariana", instagram: "@coachmari",
      notes: "Mentora de mulheres empreendedoras. Sempre topa novas ideias.",
      totalProjects: 3, totalRevenue: 2550,
    } }),
  ]);
  console.log(`✅ ${clients.length} clientes cadastrados.`);
  const [cBruna, cCamila, cMari] = clients;

  // ── 5) Leads ───────────────────────────────────────────────────────────────
  await prisma.lead.deleteMany({});
  const leadsData = [
    { name: "Mariana Costa", email: "contato@coachmari.com.br", phone: "(54) 99812-7744", company: "Coach Mariana · Mentoria Feminina",
      website: "https://instagram.com/coachmari", source: "social", status: "qualified", service: "Gestão de Instagram",
      score: 86, value: 850, notes: "Quer pacote Avançado. Decisão até sexta.", tags: ["hot", "avancado"], assignedTo: "loa", clientId: cMari.id,
      createdAt: daysAgo(4), updatedAt: daysAgo(1), lastContactAt: daysAgo(1) },
    { name: "Studio CR Estética", email: "studiocr@gmail.com", phone: "(54) 99654-2210", company: "Studio CR — Estética",
      website: "https://instagram.com/studiocrestetica", source: "referral", status: "proposal", service: "Pacote Intermediário",
      score: 72, value: 450, notes: "Indicada pela Mariana. Orçamento enviado.", tags: ["indicacao", "estetica"], assignedTo: "loa",
      createdAt: daysAgo(8), updatedAt: daysAgo(2), lastContactAt: daysAgo(2) },
    { name: "Juliana Ferraz", email: "juliana.ferraz@email.com", phone: "(11) 98432-1109", company: "La Doce Confeitaria",
      website: "https://instagram.com/ladoceconfeitaria", source: "organic", status: "contacted", service: "Artes para redes sociais",
      score: 58, value: 250, notes: "Quer começar pelo Básico.", tags: ["basico", "confeitaria"], assignedTo: "loa",
      createdAt: daysAgo(12), updatedAt: daysAgo(5), lastContactAt: daysAgo(5) },
    { name: "Roberta Alves", email: "roberta@terapiaholistica.com", phone: "(51) 99811-3322", company: "Terapia Holística Roberta",
      website: "https://instagram.com/roberta.terapeuta", source: "social", status: "new", service: "Identidade Visual",
      score: 42, value: 1800, notes: "Chegou pelo direct do Insta. Rebrand completo.", tags: ["branding", "terapia"], assignedTo: null,
      createdAt: daysAgo(2), updatedAt: daysAgo(2), lastContactAt: null },
    { name: "Bruna Tavares", email: "bruna@nuteatelie.com", phone: "(48) 99987-4421", company: "Nutê Ateliê de Joias",
      website: "https://instagram.com/nuteatelie", source: "paid", status: "won", service: "Pacote Avançado",
      score: 95, value: 850, notes: "Cliente Loa desde dez/24. Renovou contrato anual.", tags: ["cliente-ativo", "avancado"], assignedTo: "loa", clientId: cBruna.id,
      createdAt: daysAgo(60), updatedAt: daysAgo(3), lastContactAt: daysAgo(3) },
    { name: "Camila Rocha", email: "camila@studio.com", phone: "(54) 99876-5544", company: "Studio Camila Rocha",
      website: "https://instagram.com/camilarocha.foto", source: "referral", status: "won", service: "Pacote Intermediário",
      score: 88, value: 450, notes: "Cliente ativo há 4 meses. +220% no Instagram.", tags: ["cliente-ativo", "fotografia"], assignedTo: "loa", clientId: cCamila.id,
      createdAt: daysAgo(120), updatedAt: daysAgo(7), lastContactAt: daysAgo(7) },
    { name: "Patrícia Lemos", email: "patricia@email.com", phone: "(31) 99554-2018", company: "Clínica Patrícia Lemos · Odontologia",
      website: null, source: "organic", status: "new", service: "Branding básico",
      score: 38, value: 1200, notes: "Abriu clínica nova. Identidade visual + redes do zero.", tags: ["novo-negocio", "odonto"], assignedTo: null,
      createdAt: daysAgo(1), updatedAt: daysAgo(1), lastContactAt: null },
    { name: "Letícia Andrade", email: "leticia@email.com", phone: "(85) 99431-7788", company: "Doce Vida Confeitaria",
      website: "https://instagram.com/docevidaconf", source: "social", status: "lost", service: "Pacote Básico",
      score: 28, value: 250, notes: "Achou caro. Vai tocar interno por enquanto.", tags: ["perdido", "preco"], assignedTo: "loa",
      createdAt: daysAgo(25), updatedAt: daysAgo(15), lastContactAt: daysAgo(15) },
  ];

  for (const l of leadsData) {
    await prisma.lead.create({ data: { ...l, tags: JSON.stringify(l.tags) } });
  }
  console.log(`✅ ${leadsData.length} leads cadastrados.`);

  // ── 6) Projects ────────────────────────────────────────────────────────────
  await prisma.project.deleteMany({});
  await prisma.project.createMany({ data: [
    {
      name: "Gestão Instagram · Março", clientId: cBruna.id, clientName: cBruna.name,
      status: "IN_PROGRESS", progress: 72, value: 850,
      deadline: daysFromNow(15),
      description: "Calendário de 6 Reels + 10 posts + 20 stories. Foco na coleção outono.",
    },
    {
      name: "Identidade Visual · Coach Mariana", clientId: cMari.id, clientName: cMari.name,
      status: "REVIEW", progress: 90, value: 1800,
      deadline: daysFromNow(5),
      description: "Logo + paleta + tipografia + manual da marca em PDF.",
    },
    {
      name: "Pacote Intermediário · Março", clientId: cCamila.id, clientName: cCamila.name,
      status: "IN_PROGRESS", progress: 45, value: 450,
      deadline: daysFromNow(10),
      description: "4 Reels + 6 posts no feed. Tema: bastidores de ensaios.",
    },
    {
      name: "Branding Básico · Studio CR", clientId: null, clientName: "Studio CR Estética",
      status: "DRAFT", progress: 10, value: 1200,
      deadline: daysFromNow(45),
      description: "Brand voice + paleta + 3 templates para feed. Aguardando aprovação.",
    },
  ] });
  console.log("✅ 4 projetos cadastrados.");

  // ── 7) Quotes ──────────────────────────────────────────────────────────────
  await prisma.quote.deleteMany({});
  await prisma.quote.create({ data: {
    clientName: "Studio CR Estética", clientEmail: "studiocr@gmail.com", clientPhone: "(54) 99654-2210",
    status: "sent",
    items: JSON.stringify([
      { description: "Pacote Intermediário (mensal)", quantity: 1, unitPrice: 450 },
      { description: "Setup inicial de identidade", quantity: 1, unitPrice: 200 },
    ]),
    discount: 50, total: 600,
    notes: "Desconto de R$50 para fechamento na semana.",
    validUntil: daysFromNow(7),
  } });
  await prisma.quote.create({ data: {
    clientName: "Patrícia Lemos", clientEmail: "patricia@email.com", clientPhone: "(31) 99554-2018",
    status: "draft",
    items: JSON.stringify([
      { description: "Branding Básico", quantity: 1, unitPrice: 1200 },
      { description: "Pacote Básico (3 meses antecipados)", quantity: 3, unitPrice: 250 },
    ]),
    discount: 100, total: 1850,
    notes: "Combo lançamento clínica nova.",
    validUntil: daysFromNow(14),
  } });
  console.log("✅ 2 orçamentos cadastrados.");

  // ── 8) Transactions ────────────────────────────────────────────────────────
  await prisma.transaction.deleteMany({});
  await prisma.transaction.createMany({ data: [
    { description: "Pacote Avançado · Nutê Ateliê",        client: "Bruna Tavares",  type: "income",  value: 850,  date: daysAgo(3),  category: "Recebimento" },
    { description: "Identidade Visual · Coach Mariana",    client: "Mariana Costa",  type: "income",  value: 1800, date: daysAgo(7),  category: "Recebimento" },
    { description: "Pacote Intermediário · Studio Camila", client: "Camila Rocha",   type: "income",  value: 450,  date: daysAgo(10), category: "Recebimento" },
    { description: "Adobe Creative Cloud (anuidade)",      client: "—",              type: "expense", value: 299,  date: daysAgo(15), category: "Software" },
    { description: "Canva Pro",                            client: "—",              type: "expense", value: 69,   date: daysAgo(15), category: "Software" },
    { description: "Banco de imagens (Envato)",            client: "—",              type: "expense", value: 89,   date: daysAgo(20), category: "Conteúdo" },
    { description: "Pacote Básico · La Doce Confeitaria", client: "Juliana Ferraz", type: "income",  value: 250,  date: daysAgo(22), category: "Recebimento" },
  ] });
  console.log("✅ 7 transações cadastradas.");

  // ── 9) Testimonials ────────────────────────────────────────────────────────
  await prisma.testimonial.deleteMany({});
  await prisma.testimonial.createMany({ data: [
    { name: "Bruna Tavares", role: "Nutê Ateliê de Joias", text: "A Loa entendeu minha marca como ninguém. Em 3 meses meu Instagram triplicou de seguidores qualificados.", result: "+220% em engajamento", stars: 5, order: 0 },
    { name: "Mariana Costa", role: "Coach Mariana", text: "Mais que designer, é parceira de negócio. Cada arte tem estratégia por trás. Recomendo de olhos fechados.", result: "8 novos clientes em 30 dias", stars: 5, order: 1 },
    { name: "Camila Rocha", role: "Studio Camila Rocha · Fotografia", text: "Consistência e profissionalismo desde o primeiro post. Meu feed virou referência no nicho.", result: "+220% no Instagram", stars: 5, order: 2 },
  ] });
  console.log("✅ 3 depoimentos cadastrados.");

  // ── 10) Portfolio ──────────────────────────────────────────────────────────
  await prisma.portfolioItem.deleteMany({});
  await prisma.portfolioItem.createMany({ data: [
    { title: "Rebranding Nutê Ateliê", client: "Nutê Ateliê de Joias", category: "branding", imageUrl: "https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=800", featured: true, order: 0, description: "Identidade visual completa para marca de joias autorais." },
    { title: "Campanha Coach Mariana", client: "Coach Mariana", category: "social-media", imageUrl: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=800", featured: true, order: 1, description: "Série de Reels para captação de mentorandas." },
    { title: "Feed Studio Camila", client: "Studio Camila Rocha", category: "social-media", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800", featured: false, order: 2, description: "Curadoria e direção de arte mensal." },
  ] });
  console.log("✅ 3 itens de portfólio cadastrados.");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log(`👉 Login admin de demo: ${DEMO_ADMIN_EMAIL} (senha não exibida).`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
