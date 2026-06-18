import type {
  User,
  Lead,
  Client,
  Project,
  Service,
  Quote,
  Transaction,
  AgencySettings,
  DashboardStats,
  ChartDataPoint,
  Notification,
  Activity,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Dados iniciais (seed) da Loa Design
// Usados como fallback quando o localStorage está vazio.
// Valores realistas para agência iniciante de social media / branding no BR.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Users / Equipe ───────────────────────────────────────────────────────────

export const mockUsers: User[] = [
  {
    id: 'usr_loa',
    name: 'Loa',
    email: 'loadesigndigital@gmail.com',
    avatar: null,
    role: 'admin',
    status: 'active',
    createdAt: '2024-08-01T10:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
    lastLoginAt: '2025-03-12T08:30:00Z',
    permissions: ['*'],
  },
]

export const mockCurrentUser: User = mockUsers[0]

// ─── Leads (clientes em prospecção) ───────────────────────────────────────────

const today = () => new Date()
const daysAgo = (n: number) =>
  new Date(today().getTime() - n * 24 * 60 * 60 * 1000).toISOString()

export const mockLeads: Lead[] = [
  {
    id: 'lead_01',
    name: 'Mariana Costa',
    email: 'contato@coachmari.com.br',
    phone: '(54) 99812-7744',
    company: 'Coach Mariana · Mentoria Feminina',
    website: 'https://instagram.com/coachmari',
    source: 'social',
    status: 'qualified',
    service: 'Gestão de Instagram',
    score: 86,
    value: 850,
    notes: 'Quer pacote Avançado. Já tem identidade visual definida. Decisão até sexta.',
    tags: ['hot', 'avancado', 'mentoria'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
    lastContactAt: daysAgo(1),
  },
  {
    id: 'lead_02',
    name: 'Studio CR Estética',
    email: 'studiocr@gmail.com',
    phone: '(54) 99654-2210',
    company: 'Studio CR — Estética e Bem-Estar',
    website: 'https://instagram.com/studiocrestetica',
    source: 'referral',
    status: 'proposal',
    service: 'Pacote Intermediário',
    score: 72,
    value: 450,
    notes: 'Indicada pela Mariana. Orçamento enviado em 12/03.',
    tags: ['indicacao', 'estetica'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
    lastContactAt: daysAgo(2),
  },
  {
    id: 'lead_03',
    name: 'Juliana Ferraz',
    email: 'juliana.ferraz@email.com',
    phone: '(11) 98432-1109',
    company: 'La Doce Confeitaria Artesanal',
    website: 'https://instagram.com/ladoceconfeitaria',
    source: 'organic',
    status: 'contacted',
    service: 'Artes para redes sociais',
    score: 58,
    value: 250,
    notes: 'Quer começar pelo Básico e ir crescendo. Marca já tem público fiel local.',
    tags: ['basico', 'confeitaria'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(12),
    updatedAt: daysAgo(5),
    lastContactAt: daysAgo(5),
  },
  {
    id: 'lead_04',
    name: 'Roberta Alves',
    email: 'roberta@terapiaholistica.com',
    phone: '(51) 99811-3322',
    company: 'Terapia Holística Roberta',
    website: 'https://instagram.com/roberta.terapeuta',
    source: 'social',
    status: 'new',
    service: 'Identidade Visual',
    score: 42,
    value: 1800,
    notes: 'Chegou pelo direct do Insta. Quer rebrand completo + manual da marca.',
    tags: ['branding', 'terapia'],
    assignedTo: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    lastContactAt: null,
  },
  {
    id: 'lead_05',
    name: 'Bruna Tavares',
    email: 'bruna@nuteatelie.com',
    phone: '(48) 99987-4421',
    company: 'Nutê Ateliê de Joias',
    website: 'https://instagram.com/nuteatelie',
    source: 'paid',
    status: 'won',
    service: 'Pacote Avançado',
    score: 95,
    value: 850,
    notes: 'Cliente Loa desde dez/24. Renovou contrato anual.',
    tags: ['cliente-ativo', 'joalheria', 'avancado'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
    lastContactAt: daysAgo(3),
  },
  {
    id: 'lead_06',
    name: 'Camila Rocha',
    email: 'camila@studio.com',
    phone: '(54) 99876-5544',
    company: 'Studio Camila Rocha · Fotografia',
    website: 'https://instagram.com/camilarocha.foto',
    source: 'referral',
    status: 'won',
    service: 'Pacote Intermediário',
    score: 88,
    value: 450,
    notes: 'Cliente ativo há 4 meses. Crescimento de 220% no Instagram.',
    tags: ['cliente-ativo', 'fotografia'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(120),
    updatedAt: daysAgo(7),
    lastContactAt: daysAgo(7),
  },
  {
    id: 'lead_07',
    name: 'Patrícia Lemos',
    email: 'patricia@email.com',
    phone: '(31) 99554-2018',
    company: 'Clínica Patrícia Lemos · Odontologia',
    website: null,
    source: 'organic',
    status: 'new',
    service: 'Branding básico',
    score: 38,
    value: 1200,
    notes: 'Abriu clínica nova. Precisa de identidade visual + redes do zero.',
    tags: ['novo-negocio', 'odonto'],
    assignedTo: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    lastContactAt: null,
  },
  {
    id: 'lead_08',
    name: 'Letícia Andrade',
    email: 'leticia@email.com',
    phone: '(85) 99431-7788',
    company: 'Doce Vida Confeitaria',
    website: 'https://instagram.com/docevidaconf',
    source: 'social',
    status: 'lost',
    service: 'Pacote Básico',
    score: 28,
    value: 250,
    notes: 'Achou caro. Vai tocar interno por enquanto.',
    tags: ['perdido', 'preco'],
    assignedTo: 'usr_loa',
    createdAt: daysAgo(25),
    updatedAt: daysAgo(15),
    lastContactAt: daysAgo(15),
  },
]

// ─── Clients (clientes ativos pagantes) ───────────────────────────────────────

export const mockClients: Client[] = [
  {
    id: 'cli_01',
    name: 'Bruna Tavares',
    email: 'bruna@nuteatelie.com',
    phone: '(48) 99987-4421',
    company: 'Nutê Ateliê de Joias',
    instagram: '@nuteatelie',
    notes: 'Pacote Avançado anual. Aniversário em 14/09.',
    totalProjects: 6,
    totalRevenue: 5100,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(3),
  },
  {
    id: 'cli_02',
    name: 'Camila Rocha',
    email: 'camila@studio.com',
    phone: '(54) 99876-5544',
    company: 'Studio Camila Rocha',
    instagram: '@camilarocha.foto',
    notes: 'Cresceu 220% no Insta nos últimos 4 meses.',
    totalProjects: 4,
    totalRevenue: 1800,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(7),
  },
  {
    id: 'cli_03',
    name: 'Mariana Costa',
    email: 'contato@coachmari.com.br',
    phone: '(54) 99812-7744',
    company: 'Coach Mariana',
    instagram: '@coachmari',
    notes: 'Mentora de mulheres empreendedoras. Sempre topa novas ideias.',
    totalProjects: 3,
    totalRevenue: 2550,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
]

// ─── Projects (projetos em execução) ──────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: 'prj_01',
    name: 'Gestão Instagram · Março',
    client: 'Bruna Tavares',
    clientId: 'cli_01',
    status: 'IN_PROGRESS',
    progress: 72,
    value: 850,
    deadline: new Date(today().getFullYear(), today().getMonth(), 30).toISOString(),
    description: 'Calendário de 6 Reels + 10 posts + 20 stories. Foco na coleção outono.',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
  {
    id: 'prj_02',
    name: 'Identidade Visual · Coach Mariana',
    client: 'Mariana Costa',
    clientId: 'cli_03',
    status: 'REVIEW',
    progress: 90,
    value: 1800,
    deadline: new Date(today().getFullYear(), today().getMonth(), today().getDate() + 5).toISOString(),
    description: 'Logo + paleta + tipografia + manual da marca em PDF.',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
  },
  {
    id: 'prj_03',
    name: 'Pacote Intermediário · Março',
    client: 'Camila Rocha',
    clientId: 'cli_02',
    status: 'IN_PROGRESS',
    progress: 45,
    value: 450,
    deadline: new Date(today().getFullYear(), today().getMonth(), 28).toISOString(),
    description: '4 Reels + 6 posts no feed. Tema: bastidores de ensaios.',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
  },
  {
    id: 'prj_04',
    name: 'Branding Básico · Studio CR',
    client: 'Studio CR Estética',
    clientId: null,
    status: 'DRAFT',
    progress: 10,
    value: 1200,
    deadline: new Date(today().getFullYear(), today().getMonth() + 1, 15).toISOString(),
    description: 'Brand voice + paleta + 3 templates para feed. Aguardando aprovação do orçamento.',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
]

// ─── Services / Pacotes Loa ───────────────────────────────────────────────────

export const mockServices: Service[] = [
  {
    id: 'svc_basico',
    name: 'Pacote Básico',
    slug: 'basico',
    description: 'Para quem está começando a se posicionar nas redes com consistência.',
    price: 250,
    featured: false,
    active: true,
    items: [
      '2 Reels editados por mês',
      '3 Posts para feed',
      'Artes 100% personalizadas',
      'Cronograma de postagens',
      'Suporte por WhatsApp',
    ],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(30),
  },
  {
    id: 'svc_intermediario',
    name: 'Pacote Intermediário',
    slug: 'intermediario',
    description: 'Para marcas que querem crescer no Instagram com presença consistente.',
    price: 450,
    featured: true,
    active: true,
    items: [
      '4 Reels editados por mês',
      '6 Posts para feed',
      '8 Stories estratégicos',
      'Cronograma + roteiros',
      'Relatório mensal de desempenho',
    ],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(30),
  },
  {
    id: 'svc_avancado',
    name: 'Pacote Avançado',
    slug: 'avancado',
    description: 'Gestão completa de Instagram para marcas que levam o digital a sério.',
    price: 850,
    featured: false,
    active: true,
    items: [
      '6 Reels editados por mês',
      '10 Posts para feed',
      'Gestão completa de stories',
      'Estratégia de conteúdo mensal',
      'Resposta a comentários e direct',
      'Reuniões quinzenais de alinhamento',
    ],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(30),
  },
  {
    id: 'svc_branding',
    name: 'Branding Básico',
    slug: 'branding-basico',
    description: 'Posicionamento + identidade visual essencial para marcas iniciantes.',
    price: 1200,
    featured: false,
    active: true,
    items: [
      'Brand voice e posicionamento',
      'Paleta de cores e tipografia',
      '3 templates de feed',
      'Mini-manual da marca em PDF',
    ],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
  {
    id: 'svc_identidade',
    name: 'Identidade Visual Completa',
    slug: 'identidade-visual',
    description: 'Identidade visual completa: do conceito ao manual de marca.',
    price: 1800,
    featured: false,
    active: true,
    items: [
      'Logo principal + variações',
      'Paleta de cores ampla',
      'Tipografia e hierarquia',
      'Manual completo da marca (PDF)',
      'Mockups de aplicação',
    ],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
  {
    id: 'svc_reels',
    name: 'Pacote de Reels',
    slug: 'reels-avulso',
    description: 'Edição profissional de Reels avulsos para datas e campanhas pontuais.',
    price: 180,
    featured: false,
    active: true,
    items: [
      '3 Reels editados',
      'Legendas com chamada estratégica',
      'Trilha sonora em tendência',
      'Entrega em 5 dias úteis',
    ],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(30),
  },
]

// ─── Quotes (orçamentos) ──────────────────────────────────────────────────────

export const mockQuotes: Quote[] = [
  {
    id: 'q_01',
    clientName: 'Studio CR Estética',
    clientEmail: 'studiocr@gmail.com',
    clientPhone: '(54) 99654-2210',
    status: 'sent',
    items: [
      { description: 'Pacote Intermediário (mensal)', quantity: 1, unitPrice: 450 },
      { description: 'Setup inicial de identidade', quantity: 1, unitPrice: 200 },
    ],
    discount: 50,
    total: 600,
    notes: 'Desconto de R$50 para fechamento na semana.',
    validUntil: new Date(today().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'q_02',
    clientName: 'Patrícia Lemos',
    clientEmail: 'patricia@email.com',
    clientPhone: '(31) 99554-2018',
    status: 'draft',
    items: [
      { description: 'Branding Básico', quantity: 1, unitPrice: 1200 },
      { description: 'Pacote Básico (3 meses antecipados)', quantity: 3, unitPrice: 250 },
    ],
    discount: 100,
    total: 1850,
    notes: 'Combo lançamento clínica nova.',
    validUntil: new Date(today().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
]

// ─── Transactions (financeiro) ────────────────────────────────────────────────

export const mockTransactions: Transaction[] = [
  { id: 't_01', description: 'Pacote Avançado · Nutê Ateliê',           client: 'Bruna Tavares',  type: 'income',  value: 850,  date: daysAgo(3),  category: 'Recebimento', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: 't_02', description: 'Identidade Visual · Coach Mariana',       client: 'Mariana Costa',  type: 'income',  value: 1800, date: daysAgo(7),  category: 'Recebimento', createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: 't_03', description: 'Pacote Intermediário · Studio Camila',    client: 'Camila Rocha',   type: 'income',  value: 450,  date: daysAgo(10), category: 'Recebimento', createdAt: daysAgo(10), updatedAt: daysAgo(10) },
  { id: 't_04', description: 'Adobe Creative Cloud (anuidade)',         client: '—',              type: 'expense', value: 299,  date: daysAgo(15), category: 'Software',    createdAt: daysAgo(15), updatedAt: daysAgo(15) },
  { id: 't_05', description: 'Canva Pro',                               client: '—',              type: 'expense', value: 69,   date: daysAgo(15), category: 'Software',    createdAt: daysAgo(15), updatedAt: daysAgo(15) },
  { id: 't_06', description: 'Banco de imagens (Envato)',               client: '—',              type: 'expense', value: 89,   date: daysAgo(20), category: 'Conteúdo',    createdAt: daysAgo(20), updatedAt: daysAgo(20) },
  { id: 't_07', description: 'Pacote Básico · La Doce Confeitaria',     client: 'Juliana Ferraz', type: 'income',  value: 250,  date: daysAgo(22), category: 'Recebimento', createdAt: daysAgo(22), updatedAt: daysAgo(22) },
]

// ─── Agency Settings (padrão) ─────────────────────────────────────────────────

export const defaultAgencySettings: AgencySettings = {
  name: 'Loa Design',
  email: 'loadesigndigital@gmail.com',
  whatsapp: '5554999912694',
  instagram: '@loadesigndigital',
  website: 'https://loadesign.com.br',
  ownerName: 'Loa',
  ownerEmail: 'loadesigndigital@gmail.com',
  notifications: {
    newLead: true,
    statusChange: true,
    paymentReceived: true,
    projectDelivered: true,
  },
}

// ─── Dashboard Stats (overview) ───────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  totalRevenue:   { value: 3350, change: 18.4,  trend: 'up',   period: 'vs mês anterior' },
  totalLeads:     { value: 8,    change: 33.0,  trend: 'up',   period: 'vs mês anterior' },
  conversionRate: { value: 25.0, change: 4.1,   trend: 'up',   period: 'vs mês anterior' },
  activeUsers:    { value: 3,    change: 50.0,  trend: 'up',   period: 'clientes ativos' },
  averageTicket:  { value: 720,  change: 12.0,  trend: 'up',   period: 'ticket médio' },
  churnRate:      { value: 0,    change: 0,     trend: 'neutral', period: 'sem cancelamentos' },
}

// ─── Charts ───────────────────────────────────────────────────────────────────

export const mockRevenueChart: ChartDataPoint[] = [
  { label: 'Set', value: 1100, secondary: 800  },
  { label: 'Out', value: 1450, secondary: 950  },
  { label: 'Nov', value: 1800, secondary: 1100 },
  { label: 'Dez', value: 2100, secondary: 1450 },
  { label: 'Jan', value: 2400, secondary: 1700 },
  { label: 'Fev', value: 2830, secondary: 1900 },
  { label: 'Mar', value: 3350, secondary: 2150 },
]

export const mockLeadsBySource: ChartDataPoint[] = [
  { label: 'Instagram', value: 4, color: '#B08B7D' },
  { label: 'Indicação', value: 2, color: '#9a7568' },
  { label: 'Orgânico',  value: 2, color: '#c4a898' },
  { label: 'Tráfego pago', value: 1, color: '#d4bab0' },
]

export const mockConversionFunnel: ChartDataPoint[] = [
  { label: 'Visitantes do site', value: 420 },
  { label: 'Leads',              value: 8   },
  { label: 'Qualificados',       value: 4   },
  { label: 'Orçamento enviado',  value: 2   },
  { label: 'Fechados',           value: 2   },
]

export const mockWeeklyLeads: ChartDataPoint[] = [
  { label: 'Seg', value: 2 },
  { label: 'Ter', value: 1 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 0 },
  { label: 'Sex', value: 1 },
  { label: 'Sáb', value: 1 },
  { label: 'Dom', value: 0 },
]

// ─── Notifications ────────────────────────────────────────────────────────────

export const mockNotifications: Notification[] = [
  { id: 'n_01', type: 'lead',   title: 'Novo lead recebido',  description: 'Patrícia Lemos quer rebrand completo.',  read: false, createdAt: daysAgo(1),  href: '/leads' },
  { id: 'n_02', type: 'deal',   title: 'Orçamento aceito 🎉', description: 'Studio CR aceitou o orçamento.',          read: false, createdAt: daysAgo(2),  href: '/quotes' },
  { id: 'n_03', type: 'system', title: 'Relatório de Março disponível', description: 'Veja o desempenho dos clientes ativos.', read: true, createdAt: daysAgo(4), href: '/finance' },
]

// ─── Activities ───────────────────────────────────────────────────────────────

export const mockActivities: Activity[] = [
  { id: 'a_01', userId: 'usr_loa', userName: 'Loa', userAvatar: null, action: 'fechou contrato com', target: 'Nutê Ateliê de Joias', targetType: 'lead',    targetId: 'lead_05', createdAt: daysAgo(3) },
  { id: 'a_02', userId: 'usr_loa', userName: 'Loa', userAvatar: null, action: 'enviou orçamento para', target: 'Studio CR Estética',  targetType: 'lead',    targetId: 'lead_02', createdAt: daysAgo(2) },
  { id: 'a_03', userId: 'usr_loa', userName: 'Loa', userAvatar: null, action: 'qualificou',            target: 'Coach Mariana',       targetType: 'lead',    targetId: 'lead_01', createdAt: daysAgo(1) },
  { id: 'a_04', userId: 'usr_loa', userName: 'Loa', userAvatar: null, action: 'iniciou projeto',       target: 'Identidade Coach Mariana', targetType: 'project', targetId: 'prj_02', createdAt: daysAgo(2) },
  { id: 'a_05', userId: 'usr_loa', userName: 'Loa', userAvatar: null, action: 'recebeu pagamento de',  target: 'Bruna Tavares',       targetType: 'lead',    targetId: 'lead_05', createdAt: daysAgo(3) },
]
