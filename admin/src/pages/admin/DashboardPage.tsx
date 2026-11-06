import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, UserPlus, Hourglass, CheckCircle2, Briefcase, Landmark, Wallet, AlertTriangle,
  TrendingUp, CalendarDays, Flag, Activity, ArrowRight, AlertCircle, Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { useDetail } from '@/components/commercial/DetailHost'
import { ErrorBlock, LoadingBlock } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { useLeadsStore } from '@/store/leads.store'
import { dashboardApi } from '@/services/commercial.service'
import { brl, formatDay, formatInstant, EVENT_TYPE } from '@/lib/commercial'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — somente métricas reais calculadas pelo backend (/api/dashboard).
// Valores estimados, contratados, a receber e recebidos são exibidos separados.
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: d, loading, error, reload } = useApiData(() => dashboardApi.overview(), [])
  const newSiteLeads = useLeadsStore((s) => s.items.filter((l) => l.status === 'new').length)
  const openDetail = useDetail((s) => s.open)
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <PageHeader title="Visão geral" description={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={<Button size="sm" variant="primary" leftIcon={<Plus size={13} />} onClick={() => navigate('/proposals')}>Novo orçamento</Button>} />

      {newSiteLeads > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-loa-600/8 border border-loa-600/20">
          <AlertCircle size={15} className="text-loa-400 shrink-0" />
          <p className="flex-1 text-sm text-white/70">
            <span className="font-semibold text-loa-400">{newSiteLeads} {newSiteLeads === 1 ? 'novo contato' : 'novos contatos'}</span> do site aguardando retorno (leads).
          </p>
          <Link to="/leads" className="text-xs text-loa-400 hover:underline inline-flex items-center gap-1">Ver leads <ArrowRight size={11} /></Link>
        </div>
      )}

      {error && <ErrorBlock message={error} onRetry={reload} />}
      {loading && !d && <LoadingBlock />}

      {d && (
        <>
          <Group title="Relacionamento">
            <Stat icon={Users} label="Contatos" value={d.contacts.total} to="/contacts" />
            <Stat icon={UserPlus} label="Prospects ativos" value={d.contacts.prospects} to="/contacts" />
            <Stat icon={UserCheck} label="Clientes" value={d.contacts.clients} to="/contacts" />
            <Stat icon={Hourglass} label="Orçamentos pendentes" value={d.proposals.pending} hint={`estimado ${brl(d.finance.estimated.amount)}`} to="/proposals" tone="warning" />
            <Stat icon={CheckCircle2} label="Orçamentos aprovados" value={d.proposals.approved} to="/proposals" tone="success" />
            <Stat icon={Briefcase} label="Projetos ativos" value={d.projects.active} to="/projects" />
          </Group>

          <Group title="Financeiro">
            <Stat icon={Landmark} label="Valor contratado" value={brl(d.finance.contracted.amount)}
              hint={d.finance.recurringMonthly.count ? `+ ${brl(d.finance.recurringMonthly.amount)}/mês em mensalidades` : 'à vista e parcelados'} to="/finance" />
            <Stat icon={Wallet} label="Contas a receber" value={brl(d.finance.pending.amount)} hint={`${d.finance.pending.count} cobrança(s) pendente(s)`} to="/finance" tone="warning" />
            <Stat icon={AlertTriangle} label="Cobranças vencidas" value={brl(d.finance.overdue.amount)} hint={`${d.finance.overdue.count} vencida(s)`} to="/finance" tone={d.finance.overdue.count ? 'danger' : undefined} />
            <Stat icon={TrendingUp} label="Recebido (efetivo)" value={brl(d.finance.received.amount)} hint={`no mês: ${brl(d.finance.receivedThisMonth.amount)}`} to="/finance" tone="success" />
          </Group>

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="card" aria-labelledby="upcoming-title">
              <header className="px-5 py-3.5 border-b border-dark-border flex items-center justify-between">
                <h2 id="upcoming-title" className="text-sm font-semibold text-white/75 flex items-center gap-2"><CalendarDays size={14} /> Próximos 7 dias</h2>
                <Link to="/agenda" className="text-xs text-loa-400 hover:underline">Agenda</Link>
              </header>
              <ul className="divide-y divide-dark-border">
                {d.upcoming.events.map((e) => (
                  <li key={e.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', EVENT_TYPE[e.type].dot)} />
                    <span className="text-white/45 w-28 shrink-0 text-xs">{formatInstant(e.startsAt, e.allDay ? { dateStyle: 'short' } : undefined)}</span>
                    <span className="truncate text-white/75">{e.title}{e.contact ? <span className="text-white/35"> · {e.contact.name}</span> : null}</span>
                  </li>
                ))}
                {d.upcoming.dues.map((r) => (
                  <li key={r.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                    <Wallet size={12} className="text-amber-300 shrink-0" />
                    <span className="text-white/45 w-28 shrink-0 text-xs">{formatDay(r.dueDate)}</span>
                    <span className="truncate text-white/75">{brl(r.amount)} · {r.contact.name}</span>
                  </li>
                ))}
                {d.upcoming.deadlines.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => openDetail('project', p.id)} className="w-full px-5 py-2.5 flex items-center gap-3 text-sm text-left hover:bg-dark-hover/40 focus-ring">
                      <Flag size={12} className="text-emerald-300 shrink-0" />
                      <span className="text-white/45 w-28 shrink-0 text-xs">{formatDay(p.dueDate)}</span>
                      <span className="truncate text-white/75">Entrega: {p.name}</span>
                    </button>
                  </li>
                ))}
                {!d.upcoming.events.length && !d.upcoming.dues.length && !d.upcoming.deadlines.length && (
                  <li className="px-5 py-8 text-center text-sm text-white/30">Nada agendado para os próximos 7 dias.</li>
                )}
              </ul>
            </section>

            <section className="card" aria-labelledby="activity-title">
              <header className="px-5 py-3.5 border-b border-dark-border">
                <h2 id="activity-title" className="text-sm font-semibold text-white/75 flex items-center gap-2"><Activity size={14} /> Atividade recente</h2>
              </header>
              <ul className="divide-y divide-dark-border">
                {d.activity.map((a) => {
                  const kind = a.entityType === 'contact' ? 'contact' : a.entityType === 'proposal' ? 'proposal' : a.entityType === 'project' ? 'project' : null
                  const content = (
                    <>
                      <span className="flex-1 min-w-0 truncate text-white/70">{a.message}</span>
                      <span className="text-2xs text-white/30 shrink-0">{formatInstant(a.createdAt)}</span>
                    </>
                  )
                  return (
                    <li key={a.id}>
                      {kind ? (
                        <button onClick={() => openDetail(kind, a.entityId)} className="w-full px-5 py-2.5 flex items-center gap-3 text-sm text-left hover:bg-dark-hover/40 focus-ring">{content}</button>
                      ) : (
                        <div className="px-5 py-2.5 flex items-center gap-3 text-sm">{content}</div>
                      )}
                    </li>
                  )
                })}
                {!d.activity.length && <li className="px-5 py-8 text-center text-sm text-white/30">Nenhuma atividade registrada ainda.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="text-2xs font-semibold uppercase tracking-wider text-white/35">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">{children}</div>
    </section>
  )
}

function Stat({ icon: Icon, label, value, hint, to, tone }: { icon: LucideIcon; label: string; value: string | number; hint?: string; to: string; tone?: 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-300' : tone === 'danger' ? 'text-red-400' : 'text-white'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Link to={to} className="card p-4 block hover:shadow-card-hover hover:border-loa-600/25 transition-all focus-ring">
        <div className="flex items-center justify-between">
          <p className="text-2xs uppercase tracking-wider text-white/35">{label}</p>
          <Icon size={13} className="text-white/25" />
        </div>
        <p className={cn('text-xl font-semibold mt-1.5 tracking-tight truncate', color)}>{value}</p>
        {hint && <p className="text-2xs text-white/30 mt-0.5 truncate">{hint}</p>}
      </Link>
    </motion.div>
  )
}
