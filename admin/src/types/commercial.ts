// ─────────────────────────────────────────────────────────────────────────────
// Tipos do Fluxo Comercial Integrado (espelham a API /api/contacts, /proposals,
// /work-projects, /receivables, /recurring, /calendar, /dashboard).
// Valores monetários chegam como number (2 casas); datas de calendário como
// "AAAA-MM-DD"; instantes como ISO 8601 UTC.
// ─────────────────────────────────────────────────────────────────────────────

export type ContactType = 'CLIENT' | 'PROSPECT'
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type WorkProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED'
export type PaymentMode = 'ONE_TIME' | 'INSTALLMENTS' | 'RECURRING'
export type ReceivableStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED'
export type ReceivableKind = 'ONE_TIME' | 'INSTALLMENT' | 'RECURRING'
export type PaymentMethod = 'PIX' | 'CARD' | 'BOLETO' | 'CASH' | 'OTHER'
export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'ENDED'
export type CalendarEventType = 'MEETING' | 'DELIVERY' | 'DEADLINE' | 'OTHER'
export type CalendarEventStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED'

export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface Paged<T> { items: T[]; meta: PageMeta }

export interface HistoryEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  message: string
  data: Record<string, unknown> | null
  createdAt: string
}

export interface ContactRef { id: string; name: string; phone?: string; email?: string | null; type?: ContactType }

export interface Contact {
  id: string
  name: string
  phone: string
  phoneNormalized: string
  email: string | null
  type: ContactType
  source: string | null
  notes: string | null
  convertedAt: string | null
  archivedAt: string | null
  legacyLeadId: string | null
  legacyClientId: string | null
  createdAt: string
  updatedAt: string
  _count?: { proposals: number; projects: number }
}

export interface DuplicateCandidate {
  id: string
  name: string
  phone: string
  email: string | null
  type: ContactType
  archivedAt: string | null
  matchedBy: Array<'phone' | 'email'>
}

export interface ContactDetail extends Contact {
  proposals: Array<Proposal & { project: { id: string; name: string; status: WorkProjectStatus } | null }>
  projects: WorkProject[]
  receivables: Receivable[]
  history: HistoryEntry[]
  possibleDuplicates: DuplicateCandidate[]
}

export interface ContactInput {
  name: string
  phone: string
  email?: string | null
  type?: ContactType
  source?: string | null
  notes?: string | null
}

export interface Proposal {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  title: string
  description: string | null
  serviceId: string | null
  serviceName: string | null
  estimatedValue: number | null
  status: ProposalStatus
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  contact?: ContactRef & { archivedAt?: string | null }
  project?: { id: string; name: string; status: WorkProjectStatus; contractedValue: number; paymentMode: PaymentMode } | null
}

export interface ProposalDetail extends Proposal { history: HistoryEntry[] }

export interface ProposalInput {
  contactId?: string
  contact?: ContactInput
  allowDuplicateContact?: boolean
  title?: string | null
  description?: string | null
  serviceId?: string | null
  estimatedValue?: number | string | null
}

export type PaymentPlanInput =
  | { mode: 'ONE_TIME'; dueDate: string; method?: PaymentMethod | null }
  | { mode: 'INSTALLMENTS'; count: number; firstDueDate: string; dueDates?: string[]; method?: PaymentMethod | null }
  | { mode: 'RECURRING'; dueDay: number; startDate: string; endDate?: string | null; method?: PaymentMethod | null; generateUntil?: string | null }

export interface ApproveInput {
  serviceId?: string | null
  serviceName?: string | null
  finalValue: number | string
  projectName?: string | null
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  payment: PaymentPlanInput
}

export interface RecurringAgreement {
  id: string
  projectId: string
  contactId: string
  amount: number
  dueDay: number
  startDate: string
  endDate: string | null
  status: RecurringStatus
  paymentMethod: PaymentMethod | null
}

export interface WorkProject {
  id: string
  contactId: string
  proposalId: string | null
  name: string
  description: string | null
  serviceId: string | null
  serviceName: string
  contractedValue: number
  paymentMode: PaymentMode
  status: WorkProjectStatus
  startDate: string | null
  dueDate: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  contact?: ContactRef
  proposal?: { id: string; title: string; estimatedValue: number | null } | null
  recurring?: Pick<RecurringAgreement, 'id' | 'status' | 'amount' | 'dueDay'> | null
  finance?: { pending: number; received: number }
}

export interface WorkProjectDetail extends WorkProject {
  proposal: Proposal | null
  recurring: RecurringAgreement | null
  receivables: Receivable[]
  events: CalendarEvent[]
  history: HistoryEntry[]
  finance: { pending: number; received: number }
}

export interface Receivable {
  id: string
  contactId: string
  projectId: string
  recurringId: string | null
  kind: ReceivableKind
  installmentNumber: number | null
  installmentCount: number | null
  competence: string | null
  description: string
  amount: number
  dueDate: string
  status: ReceivableStatus
  paymentMethod: PaymentMethod | null
  receivedAt: string | null
  receivedAmount: number | null
  transactionId: string | null
  cancelledAt: string | null
  cancelReason: string | null
  notes: string | null
  createdAt: string
  contact?: ContactRef
  project?: { id: string; name: string; status: WorkProjectStatus }
}

export interface ReceivableDetail extends Receivable { history: HistoryEntry[] }

export interface ReceivablesPage extends Paged<Receivable> {
  totals: { amount: number; receivedAmount: number }
}

export interface MoneyCount { amount: number; count: number }

export interface FinanceSummary {
  today: string
  estimated: MoneyCount
  contracted: MoneyCount
  recurringMonthly: MoneyCount
  pending: MoneyCount
  overdue: MoneyCount
  received: MoneyCount
  receivedThisMonth: MoneyCount
}

export interface CalendarEvent {
  id: string
  title: string
  type: CalendarEventType
  status: CalendarEventStatus
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  notes: string | null
  contactId: string | null
  projectId: string | null
  contact?: ContactRef | null
  project?: { id: string; name: string } | null
}

export interface CalendarEventInput {
  title: string
  type: CalendarEventType
  startsAt: string
  endsAt?: string | null
  allDay?: boolean
  location?: string | null
  notes?: string | null
  contactId?: string | null
  projectId?: string | null
  status?: CalendarEventStatus
}

export interface DerivedCalendarItem {
  id: string
  source: 'receivable' | 'project'
  sourceId: string
  kind: 'PAYMENT_DUE' | 'PROJECT_DUE'
  title: string
  date: string
  amount?: number
  contact?: ContactRef | null
  project?: { id: string; name: string } | null
}

export interface CalendarRange { from: string; to: string; events: CalendarEvent[]; derived: DerivedCalendarItem[] }

export interface DashboardOverview {
  today: string
  contacts: { total: number; clients: number; prospects: number }
  proposals: { pending: number; approved: number; rejected: number; cancelled: number }
  projects: { active: number }
  finance: FinanceSummary
  upcoming: {
    events: CalendarEvent[]
    dues: Array<{ id: string; description: string; amount: number; dueDate: string; contact: ContactRef }>
    deadlines: Array<{ id: string; name: string; dueDate: string; contact: ContactRef }>
  }
  activity: HistoryEntry[]
}

export interface LegacyImportReport {
  summary: { leads: number; clients: number; alreadyImported: number; ready: number; conflicts: number; withoutPhone: number; phonesCorrected?: number }
  ready: Array<{ phoneNormalized: string; email: string | null; phoneOverridden?: boolean; records: Array<{ kind: 'lead' | 'client'; id: string; name: string; email: string | null; phoneOverridden?: boolean }> }>
  conflicts: Array<{ phoneNormalized: string; reasons: string[]; records: Array<{ kind: 'lead' | 'client'; id: string; name: string; email: string | null }> }>
  withoutPhone: Array<{ kind: 'lead' | 'client'; id: string; name: string; email?: string | null }>
  created?: number
}
