import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Wallet, Landmark, AlertTriangle, CheckCircle2, Hourglass, Repeat, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Input } from '@/components/ui/Input'
import { ReceivablesTable } from '@/components/commercial/ReceivablesTable'
import { ErrorBlock, LoadingBlock, Pagination, Tabs } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { receivablesApi } from '@/services/commercial.service'
import { brl } from '@/lib/commercial'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type Filter = 'PENDING' | 'OVERDUE' | 'RECEIVED' | 'CANCELLED' | ''

/**
 * Financeiro — contas a receber. Separa claramente:
 *   estimado (orçamentos pendentes) · contratado · a receber · vencido · recebido.
 * Só contas RECEBIDAS contam como receita.
 */
export function ReceivablesPage() {
  const [status, setStatus] = useState<Filter>('PENDING')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { const h = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(h) }, [search])

  const summary = useApiData(() => receivablesApi.summary(), [])
  const list = useApiData(
    () => receivablesApi.list({ status: status || undefined, search: debounced, from: from || undefined, to: to || undefined, page, pageSize: 30 }),
    [status, debounced, from, to, page]
  )
  const s = summary.data

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" description="Contas a receber, vencimentos e recebimentos confirmados"
        actions={<Link to="/finance/transactions" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 focus-ring rounded"><Receipt size={12} /> Lançamentos (caixa)</Link>} />

      {summary.error && <ErrorBlock message={summary.error} onRetry={summary.reload} />}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        <Kpi icon={Hourglass} label="Estimado (orçamentos)" value={s?.estimated.amount} hint={`${s?.estimated.count ?? 0} pendente(s) · não é receita`} muted />
        <Kpi icon={Landmark} label="Contratado" value={s?.contracted.amount} hint={`${s?.contracted.count ?? 0} projeto(s) à vista/parcelados`} />
        <Kpi icon={Repeat} label="Mensalidades ativas" value={s?.recurringMonthly.amount} hint={`${s?.recurringMonthly.count ?? 0} contrato(s) · por mês`} />
        <Kpi icon={Wallet} label="A receber" value={s?.pending.amount} hint={`${s?.pending.count ?? 0} cobrança(s)`} tone="warning" />
        <Kpi icon={AlertTriangle} label="Vencido" value={s?.overdue.amount} hint={`${s?.overdue.count ?? 0} cobrança(s)`} tone="danger" />
        <Kpi icon={CheckCircle2} label="Recebido" value={s?.received.amount} hint={`no mês: ${brl(s?.receivedThisMonth.amount ?? 0)}`} tone="success" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-end gap-3 justify-between">
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1) }} items={[
          { value: 'PENDING', label: 'A receber' }, { value: 'OVERDUE', label: 'Vencidas' },
          { value: 'RECEIVED', label: 'Recebidas' }, { value: 'CANCELLED', label: 'Canceladas' }, { value: '', label: 'Todas' },
        ]} />
        <div className="grid sm:grid-cols-[1fr_150px_150px] gap-2 xl:w-[560px]">
          <Input id="receivables-search" aria-label="Buscar cobranças" placeholder="Contato, projeto ou descrição" value={search}
            onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} />
          <Input id="receivables-from" type="date" aria-label={status === 'RECEIVED' ? 'Recebido a partir de' : 'Vencimento a partir de'} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
          <Input id="receivables-to" type="date" aria-label={status === 'RECEIVED' ? 'Recebido até' : 'Vencimento até'} value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {list.loading && !list.data && <LoadingBlock />}
        {list.error && <ErrorBlock message={list.error} onRetry={list.reload} />}
        {list.data && (
          <>
            <ReceivablesTable items={list.data.items} emptyLabel="Nenhuma cobrança neste filtro." />
            {list.data.items.length > 0 && (
              <div className="flex justify-end gap-6 px-5 py-3 border-t border-dark-border text-xs text-white/45">
                <span>Total previsto no filtro: <strong className="text-white/75">{brl(list.data.totals.amount)}</strong></span>
                {status === 'RECEIVED' && <span>Total recebido: <strong className="text-emerald-400">{brl(list.data.totals.receivedAmount)}</strong></span>}
              </div>
            )}
          </>
        )}
        <Pagination meta={list.data?.meta} onPage={setPage} />
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, hint, tone, muted }: { icon: LucideIcon; label: string; value?: number; hint?: string; tone?: 'success' | 'warning' | 'danger'; muted?: boolean }) {
  const color = tone === 'success' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-300' : tone === 'danger' ? 'text-red-400' : muted ? 'text-white/55' : 'text-loa-300'
  return (
    <div className="card p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs uppercase tracking-wider text-white/35">{label}</p>
        <Icon size={13} className="text-white/25" />
      </div>
      <p className={cn('text-lg font-semibold mt-1.5 truncate', color)}>{value == null ? '—' : brl(value)}</p>
      {hint && <p className="text-2xs text-white/30 mt-0.5">{hint}</p>}
    </div>
  )
}
