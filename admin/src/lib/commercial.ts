import type {
  ContactType, ProposalStatus, WorkProjectStatus, PaymentMode, ReceivableStatus, PaymentMethod,
  RecurringStatus, CalendarEventType, CalendarEventStatus,
} from '@/types/commercial'

// ─────────────────────────────────────────────────────────────────────────────
// Rótulos, cores de status e utilitários de data/dinheiro do fluxo comercial.
// Datas de calendário ("AAAA-MM-DD") são tratadas como dia civil local:
// nunca passam por new Date("AAAA-MM-DD"), que seria interpretado em UTC.
// ─────────────────────────────────────────────────────────────────────────────

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export const CONTACT_TYPE: Record<ContactType, { label: string; tone: Tone }> = {
  CLIENT: { label: 'Cliente', tone: 'success' },
  PROSPECT: { label: 'Prospect', tone: 'info' },
}

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Aguardando aprovação', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'success' },
  REJECTED: { label: 'Recusado', tone: 'danger' },
  CANCELLED: { label: 'Cancelado', tone: 'muted' },
}

export const PROJECT_STATUS: Record<WorkProjectStatus, { label: string; tone: Tone }> = {
  PLANNED: { label: 'Planejado', tone: 'info' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'warning' },
  REVIEW: { label: 'Em revisão', tone: 'info' },
  DONE: { label: 'Entregue', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'muted' },
}

export const PAYMENT_MODE: Record<PaymentMode, string> = {
  ONE_TIME: 'À vista',
  INSTALLMENTS: 'Parcelado',
  RECURRING: 'Mensalidade',
}

export const RECEIVABLE_STATUS: Record<ReceivableStatus | 'OVERDUE', { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  OVERDUE: { label: 'Vencida', tone: 'danger' },
  RECEIVED: { label: 'Recebida', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'muted' },
}

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CARD: 'Cartão',
  BOLETO: 'Boleto',
  CASH: 'Dinheiro',
  OTHER: 'Outros',
}

export const RECURRING_STATUS: Record<RecurringStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  PAUSED: { label: 'Pausada', tone: 'warning' },
  ENDED: { label: 'Encerrada', tone: 'muted' },
}

export const EVENT_TYPE: Record<CalendarEventType, { label: string; dot: string }> = {
  MEETING: { label: 'Reunião', dot: 'bg-blue-400' },
  DELIVERY: { label: 'Entrega', dot: 'bg-emerald-400' },
  DEADLINE: { label: 'Prazo', dot: 'bg-amber-400' },
  OTHER: { label: 'Compromisso', dot: 'bg-loa-400' },
}

export const EVENT_STATUS: Record<CalendarEventStatus, string> = {
  SCHEDULED: 'Agendado',
  DONE: 'Concluído',
  CANCELLED: 'Cancelado',
}

export const methodOptions = (Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((v) => ({ value: v, label: PAYMENT_METHOD[v] }))

// ─── Dinheiro ────────────────────────────────────────────────────────────────

export const brl = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** "1.234,56" | "1234.56" | 1234.56 → centavos; null se inválido. */
export function parseMoneyToCents(input: string | number): number | null {
  let s = typeof input === 'number' ? input.toFixed(2) : input.trim().replace(/^R\$\s*/i, '')
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(',', '.')
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'))
}

/** Mesma regra do backend: centavos restantes vão para as primeiras parcelas. */
export function splitCents(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const rest = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

// ─── Datas de calendário (dia civil) ─────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toDateKey(new Date())

export function formatDay(key: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!key) return '—'
  return new Intl.DateTimeFormat('pt-BR', opts).format(fromDateKey(key))
}

export function formatInstant(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', opts).format(new Date(iso))
}

export const formatTime = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate()

/** Soma meses mantendo o dia e limitando ao último dia do mês (31/01 → 28/02). */
export function addMonthsKey(key: string, months: number, day?: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const total = (m - 1) + months
  const ty = y + Math.floor(total / 12)
  const tm = ((total % 12) + 12) % 12
  return toDateKey(new Date(ty, tm, Math.min(day ?? d, lastDay(ty, tm))))
}

export const competenceOfKey = (key: string) => key.slice(0, 7)

export function addCompetence(competence: string, months: number) {
  return competenceOfKey(addMonthsKey(`${competence}-01`, months))
}

export const formatCompetence = (c: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(fromDateKey(`${c}-01`))

/** Valor local de <input type="datetime-local"> → ISO com o fuso do navegador. */
export function localInputToISO(value: string): string {
  return new Date(value).toISOString()
}

/** ISO → valor de <input type="datetime-local"> no fuso do navegador. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // segunda = 0
  x.setDate(x.getDate() - dow)
  return x
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const isOverdue = (r: { status: string; dueDate: string }) => r.status === 'PENDING' && r.dueDate < todayKey()

export const phoneDisplay = (p: string) => {
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return p
}
