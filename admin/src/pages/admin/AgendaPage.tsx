import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Wallet, Flag } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EventModal } from '@/components/commercial/EventModal'
import { useDetail } from '@/components/commercial/DetailHost'
import { ErrorBlock, LoadingBlock, Tabs } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { calendarApi } from '@/services/commercial.service'
import { addDays, brl, EVENT_STATUS, EVENT_TYPE, formatTime, startOfWeek, toDateKey, todayKey } from '@/lib/commercial'
import { cn } from '@/lib/utils'
import type { CalendarEvent, CalendarEventType, DerivedCalendarItem } from '@/types/commercial'

type View = 'week' | 'nextWeek' | 'month'
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function rangeFor(view: View, anchor: Date) {
  if (view === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const start = startOfWeek(first)
    return { start, days: 42, first }
  }
  const base = startOfWeek(anchor)
  return { start: view === 'nextWeek' ? addDays(base, 7) : base, days: 7, first: null }
}

export function AgendaPage() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [creatingOn, setCreatingOn] = useState<string | null>(null)
  const openDetail = useDetail((s) => s.open)

  const { start, days, first } = rangeFor(view, anchor)
  const end = addDays(start, days)
  const { data, loading, error, reload } = useApiData(
    () => calendarApi.list({ from: start.toISOString(), to: end.toISOString(), type: type || undefined, status: status || undefined }),
    [start.getTime(), days, type, status]
  )

  const byDay = useMemo(() => {
    const map: Record<string, { events: CalendarEvent[]; derived: DerivedCalendarItem[] }> = {}
    const slot = (k: string) => (map[k] ||= { events: [], derived: [] })
    for (const e of data?.events ?? []) slot(toDateKey(new Date(e.startsAt))).events.push(e)
    for (const d of data?.derived ?? []) slot(d.date).derived.push(d)
    return map
  }, [data])

  const dayKeys = Array.from({ length: days }, (_, i) => toDateKey(addDays(start, i)))
  const today = todayKey()

  const move = (dir: -1 | 1) => {
    if (view === 'month') setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1))
    else setAnchor((a) => addDays(a, 7 * dir))
  }
  const goToday = () => { setAnchor(new Date()); if (view === 'nextWeek') setView('week') }

  const title = view === 'month' && first
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(first)
    : `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start)} – ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(addDays(start, 6))}`

  const openDerived = (d: DerivedCalendarItem) => {
    if (d.project) openDetail('project', d.project.id)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Agenda" description="Reuniões, entregas, prazos e vencimentos reais"
        actions={<Button size="sm" variant="primary" leftIcon={<Plus size={13} />} onClick={() => setCreatingOn(today)}>Novo compromisso</Button>} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onChange={(v) => { setView(v); if (v !== 'month') setAnchor(new Date()) }} items={[
            { value: 'week', label: 'Esta semana' }, { value: 'nextWeek', label: 'Próxima semana' }, { value: 'month', label: 'Mês' },
          ]} />
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Período anterior" onClick={() => move(-1)}><ChevronLeft size={15} /></Button>
            <Button size="sm" variant="ghost" onClick={goToday}>Hoje</Button>
            <Button size="icon" variant="ghost" aria-label="Próximo período" onClick={() => move(1)}><ChevronRight size={15} /></Button>
          </div>
          <h2 className="text-sm font-semibold text-white/80" aria-live="polite">{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-80">
          <Select id="agenda-type" aria-label="Filtrar por tipo" value={type} onChange={(e) => setType(e.target.value)}
            options={[{ value: '', label: 'Todos os tipos' }, ...(Object.keys(EVENT_TYPE) as CalendarEventType[]).map((t) => ({ value: t, label: EVENT_TYPE[t].label }))]} />
          <Select id="agenda-status" aria-label="Filtrar por situação" value={status} onChange={(e) => setStatus(e.target.value)}
            options={[{ value: '', label: 'Ativos' }, { value: 'SCHEDULED', label: EVENT_STATUS.SCHEDULED }, { value: 'DONE', label: EVENT_STATUS.DONE }, { value: 'CANCELLED', label: EVENT_STATUS.CANCELLED }]} />
        </div>
      </div>

      <Legend />

      {error && <ErrorBlock message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock />}

      {data && view !== 'month' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {dayKeys.map((k, i) => {
            const items = byDay[k]
            return (
              <div key={k} className={cn('card p-3 min-h-[140px] flex flex-col gap-2', k === today && 'border-loa-600/40')}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/50"><span className="font-semibold text-white/75">{WEEKDAYS[i]}</span> {k.slice(8)}/{k.slice(5, 7)}</p>
                  <button aria-label={`Novo compromisso em ${k}`} className="text-white/25 hover:text-loa-300 focus-ring rounded" onClick={() => setCreatingOn(k)}><Plus size={13} /></button>
                </div>
                <DayItems items={items} onEvent={setEditing} onDerived={openDerived} />
              </div>
            )
          })}
        </div>
      )}

      {data && view === 'month' && first && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 text-2xs uppercase tracking-wider text-white/35 border-b border-dark-border">
            {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {dayKeys.map((k) => {
              const inMonth = Number(k.slice(5, 7)) === first.getMonth() + 1
              const items = byDay[k]
              const total = (items?.events.length ?? 0) + (items?.derived.length ?? 0)
              return (
                <div key={k} className={cn('min-h-[104px] border-b border-r border-dark-border p-1.5 flex flex-col gap-1', !inMonth && 'bg-dark-bg/40 opacity-50')}>
                  <button onClick={() => setCreatingOn(k)} aria-label={`Novo compromisso em ${k}`}
                    className={cn('self-start text-xs w-6 h-6 rounded-full focus-ring', k === today ? 'bg-loa-600 text-white' : 'text-white/50 hover:bg-dark-hover')}>
                    {Number(k.slice(8))}
                  </button>
                  <DayItems items={items} onEvent={setEditing} onDerived={openDerived} compact limit={3} />
                  {total > 3 && <p className="text-2xs text-white/30 px-1">+{total - 3}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data && data.events.length === 0 && data.derived.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-white/35"><CalendarDays size={14} /> Nenhum compromisso, prazo ou vencimento neste período.</p>
      )}

      <EventModal open={Boolean(editing)} event={editing} onClose={() => setEditing(null)} />
      <EventModal open={Boolean(creatingOn)} preset={creatingOn ? { date: creatingOn } : undefined} onClose={() => setCreatingOn(null)} />
    </div>
  )
}

function DayItems({ items, onEvent, onDerived, compact, limit }: {
  items?: { events: CalendarEvent[]; derived: DerivedCalendarItem[] }
  onEvent: (e: CalendarEvent) => void
  onDerived: (d: DerivedCalendarItem) => void
  compact?: boolean
  limit?: number
}) {
  if (!items) return null
  const all = [
    ...items.events.map((e) => ({ kind: 'event' as const, e })),
    ...items.derived.map((d) => ({ kind: 'derived' as const, d })),
  ].slice(0, limit ?? Infinity)
  return (
    <ul className="space-y-1">
      {all.map((it) => it.kind === 'event' ? (
        <li key={it.e.id}>
          <button onClick={() => onEvent(it.e)} title={it.e.title}
            className={cn('w-full text-left rounded-md px-1.5 py-1 text-2xs hover:bg-dark-hover focus-ring flex items-center gap-1.5',
              it.e.status === 'CANCELLED' && 'line-through opacity-50', it.e.status === 'DONE' && 'opacity-60')}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', EVENT_TYPE[it.e.type].dot)} />
            {!it.e.allDay && <span className="text-white/40 shrink-0">{formatTime(it.e.startsAt)}</span>}
            <span className="truncate text-white/75">{it.e.title}</span>
          </button>
          {!compact && (it.e.contact || it.e.project) && (
            <p className="px-1.5 text-2xs text-white/30 truncate">{[it.e.contact?.name, it.e.project?.name].filter(Boolean).join(' · ')}</p>
          )}
        </li>
      ) : (
        <li key={it.d.id}>
          <button onClick={() => onDerived(it.d)} title={it.d.title}
            className="w-full text-left rounded-md px-1.5 py-1 text-2xs hover:bg-dark-hover focus-ring flex items-center gap-1.5 border border-dashed border-white/10">
            {it.d.kind === 'PAYMENT_DUE' ? <Wallet size={10} className="text-amber-300 shrink-0" /> : <Flag size={10} className="text-emerald-300 shrink-0" />}
            <span className="truncate text-white/60">{it.d.kind === 'PAYMENT_DUE' ? `${brl(it.d.amount)} · ${it.d.contact?.name ?? ''}` : it.d.project?.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-white/40">
      {(Object.keys(EVENT_TYPE) as CalendarEventType[]).map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5"><span className={cn('w-1.5 h-1.5 rounded-full', EVENT_TYPE[t].dot)} />{EVENT_TYPE[t].label}</span>
      ))}
      <span className="inline-flex items-center gap-1.5"><Wallet size={10} className="text-amber-300" />Vencimento de cobrança</span>
      <span className="inline-flex items-center gap-1.5"><Flag size={10} className="text-emerald-300" />Entrega prevista de projeto</span>
    </div>
  )
}
