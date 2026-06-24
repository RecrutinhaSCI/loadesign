// prisma/seed.js
// ─────────────────────────────────────────────────────────────────────────────
// Seed inicial — popula o banco com:
//  - admin user (email: admin@loadesign.com / senha: admin123)
//  - AgencySettings (singleton com dados reais da Loa)
//  - Leads/Clients/Projects/Services/Quotes/Transactions realistas
//  - Testimonials e PortfolioItems iniciais
//
// Idempotente: roda quantas vezes quiser, faz upsert.
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("🌱 Iniciando seed da Loa Design...");

  // ── 1) Admin user ──────────────────────────────────────────────────────────
  const adminEmail = "admin@loadesign.com";
  const adminPlain = "admin123";
  const passwordHash = await bcrypt.hash(adminPlain, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: passwordHash, name: "Loa", role: "ADMIN", active: true },
    create: {
      name: "Loa",
      email: adminEmail,
      password: passwordHash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`✅ Admin: ${adminEmail} / ${adminPlain}  (TROQUE EM PRODUÇÃO!)`);

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

  // ── 3) Services / Pacotes ──────────────────────────────────────────────────
  const services = [
    {
      slug: "basico", name: "Pacote Básico", price: 250, featured: false,
      description: "Para quem está começando a se posicionar nas redes com consistência.",
      items: ["2 Reels editados por mês", "3 Posts para feed", "Artes 100% personalizadas", "Cronograma de postagens", "Suporte por WhatsApp"],
    },
    {
      slug: "intermediario", name: "Pacote Intermediário", price: 450, featured: true,
      description: "Para marcas que querem crescer no Instagram com presença consistente.",
      items: ["4 Reels editados por mês", "6 Posts para feed", "8 Stories estratégicos", "Cronograma + roteiros", "Relatório mensal de desempenho"],
    },
    {
      slug: "avancado", name: "Pacote Avançado", price: 850, featured: false,
      description: "Gestão completa de Instagram para marcas que levam o digital a sério.",
      items: ["6 Reels editados por mês", "10 Posts para feed", "Gestão completa de stories", "Estratégia de conteúdo mensal", "Resposta a comentários e direct", "Reuniões quinzenais de alinhamento"],
    },
    {
      slug: "branding-basico", name: "Branding Básico", price: 1200, featured: false,
      description: "Posicionamento + identidade visual essencial para marcas iniciantes.",
      items: ["Brand voice e posicionamento", "Paleta de cores e tipografia", "3 templates de feed", "Mini-manual da marca em PDF"],
    },
    {
      slug: "identidade-visual", name: "Identidade Visual Completa", price: 1800, featured: false,
      description: "Identidade visual completa: do conceito ao manual de marca.",
      items: ["Logo principal + variações", "Paleta de cores ampla", "Tipografia e hierarquia", "Manual completo da marca (PDF)", "Mockups de aplicação"],
    },
    {
      slug: "reels-avulso", name: "Pacote de Reels", price: 180, featured: false,
      description: "Edição profissional de Reels avulsos para datas e campanhas pontuais.",
      items: ["3 Reels editados", "Legendas com chamada estratégica", "Trilha sonora em tendência", "Entrega em 5 dias úteis"],
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        ...s,
        active: true,
        items: JSON.stringify(s.items),
      },
    });
  }
  console.log(`✅ ${services.length} serviços/pacotes cadastrados.`);

  // ── 4) Dados de demonstração (somente primeira execução) ───────────────────
  // Em produção, NÃO sobrescreve dados reais já cadastrados.
  // Para forçar reset completo: SEED_RESET=true npm run db:seed
  const existingClients = await prisma.client.count();
  const force = process.env.SEED_RESET === "true";

  if (existingClients > 0 && !force) {
    console.log(`ℹ️  Banco já tem ${existingClients} cliente(s). Pulando seed de demo.`);
    console.log("   Use SEED_RESET=true npm run db:seed para forçar reset.");
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
  console.log(`👉 Login admin: ${adminEmail} / ${adminPlain}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
