import axios from 'axios'
import { api } from './api'
import { buildQueryString } from '@/lib/utils'
import type {
  Paged, Contact, ContactDetail, ContactInput, DuplicateCandidate, Proposal, ProposalDetail,
  ProposalInput, ApproveInput, WorkProject, WorkProjectDetail, ReceivablesPage, Receivable,
  ReceivableDetail, FinanceSummary, PaymentMethod, RecurringAgreement, CalendarRange, CalendarEvent,
  CalendarEventInput, DashboardOverview, LegacyImportReport, WorkProjectStatus,
} from '@/types/commercial'

// ─────────────────────────────────────────────────────────────────────────────
// Cliente da API do fluxo comercial. O backend é a fonte única de verdade:
// nenhuma tela calcula status financeiro ou cria registros localmente.
// ─────────────────────────────────────────────────────────────────────────────

type Query = Record<string, string | number | boolean | undefined>
const qs = (q?: Query) => buildQueryString(q ?? {})

export const contactsApi = {
  list: (q?: Query) => api.get<Paged<Contact>>(`/contacts${qs(q)}`),
  get: (id: string) => api.get<ContactDetail>(`/contacts/${id}`),
  create: (body: ContactInput & { allowDuplicate?: boolean }) => api.post<Contact>('/contacts', body),
  update: (id: string, body: Partial<ContactInput> & { allowDuplicate?: boolean }) => api.patch<Contact>(`/contacts/${id}`, body),
  convert: (id: string) => api.post<Contact>(`/contacts/${id}/convert`),
  archive: (id: string) => api.post<Contact>(`/contacts/${id}/archive`),
  unarchive: (id: string) => api.post<Contact>(`/contacts/${id}/unarchive`),
  duplicates: (q: { phone?: string; email?: string; excludeId?: string }) => api.get<DuplicateCandidate[]>(`/contacts/duplicates${qs(q)}`),
  // Prévia somente leitura; com telefones corrigidos, simula o resultado (POST sem gravação).
  legacyPreview: (phones?: Record<string, string>) => phones && Object.keys(phones).length
    ? api.post<LegacyImportReport>('/contacts/legacy-import/preview', { phones })
    : api.get<LegacyImportReport>('/contacts/legacy-import'),
  legacyApply: (phones?: Record<string, string>) => api.post<LegacyImportReport>('/contacts/legacy-import', { confirm: true, phones }),
}

export const proposalsApi = {
  list: (q?: Query) => api.get<Paged<Proposal> & { counts: Partial<Record<string, number>> }>(`/proposals${qs(q)}`),
  get: (id: string) => api.get<ProposalDetail>(`/proposals/${id}`),
  create: (body: ProposalInput) => api.post<Proposal>('/proposals', body),
  update: (id: string, body: Partial<ProposalInput>) => api.patch<Proposal>(`/proposals/${id}`, body),
  approve: (id: string, body: ApproveInput) => api.post<WorkProjectDetail>(`/proposals/${id}/approve`, body),
  reject: (id: string, reason?: string) => api.post<Proposal>(`/proposals/${id}/reject`, { reason }),
  reopen: (id: string, reason?: string) => api.post<Proposal>(`/proposals/${id}/reopen`, { reason }),
  cancel: (id: string, reason?: string) => api.post<Proposal>(`/proposals/${id}/cancel`, { reason }),
}

export const workProjectsApi = {
  list: (q?: Query) => api.get<Paged<WorkProject>>(`/work-projects${qs(q)}`),
  get: (id: string) => api.get<WorkProjectDetail>(`/work-projects/${id}`),
  update: (id: string, body: { name?: string; description?: string | null; status?: Exclude<WorkProjectStatus, 'CANCELLED'>; startDate?: string | null; dueDate?: string | null }) =>
    api.patch<WorkProjectDetail>(`/work-projects/${id}`, body),
  cancel: (id: string, reason: string) => api.post<WorkProjectDetail>(`/work-projects/${id}/cancel`, { reason }),
}

export const receivablesApi = {
  list: (q?: Query) => api.get<ReceivablesPage>(`/receivables${qs(q)}`),
  summary: () => api.get<FinanceSummary>('/receivables/summary'),
  get: (id: string) => api.get<ReceivableDetail>(`/receivables/${id}`),
  update: (id: string, body: { dueDate?: string; paymentMethod?: PaymentMethod | null; notes?: string | null }) => api.patch<Receivable>(`/receivables/${id}`, body),
  receive: (id: string, body: { method: PaymentMethod; receivedAt?: string; receivedAmount?: number | string; notes?: string | null }) =>
    api.post<Receivable>(`/receivables/${id}/receive`, body),
  reverse: (id: string, reason: string) => api.post<Receivable>(`/receivables/${id}/reverse`, { reason }),
  cancel: (id: string, reason: string) => api.post<Receivable>(`/receivables/${id}/cancel`, { reason }),
}

export const recurringApi = {
  generate: (id: string, body: { from?: string; until: string }) => api.post<{ created: number; skipped: number }>(`/recurring/${id}/generate`, body),
  pause: (id: string) => api.post<{ agreement: RecurringAgreement }>(`/recurring/${id}/pause`),
  resume: (id: string) => api.post<{ agreement: RecurringAgreement }>(`/recurring/${id}/resume`),
  end: (id: string) => api.post<{ agreement: RecurringAgreement; cancelledCharges: number }>(`/recurring/${id}/end`),
}

export const calendarApi = {
  list: (q: Query & { from: string; to: string }) => api.get<CalendarRange>(`/calendar${qs(q)}`),
  create: (body: CalendarEventInput) => api.post<CalendarEvent>('/calendar', body),
  update: (id: string, body: Partial<CalendarEventInput>) => api.patch<CalendarEvent>(`/calendar/${id}`, body),
}

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/dashboard'),
}

/** Erro da API com status e detalhes (ex.: 409 DUPLICATE_CONTACT). */
export function apiErrorInfo(err: unknown): { status?: number; message: string; details?: unknown } {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string; details?: unknown } | undefined
    return { status: err.response?.status, message: body?.error || err.message, details: body?.details }
  }
  return { message: err instanceof Error ? err.message : 'Erro desconhecido' }
}

export function duplicatesFrom(err: unknown): DuplicateCandidate[] | null {
  const info = apiErrorInfo(err)
  const d = info.details as { code?: string; duplicates?: DuplicateCandidate[] } | undefined
  return info.status === 409 && d?.code === 'DUPLICATE_CONTACT' ? d.duplicates ?? [] : null
}
