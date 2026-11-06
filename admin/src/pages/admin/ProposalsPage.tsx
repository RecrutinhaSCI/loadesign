import { useEffect, useState } from 'react'
import { Plus, Search, FileText } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProposalFormModal } from '@/components/commercial/ProposalFormModal'
import { useDetail } from '@/components/commercial/DetailHost'
import { ErrorBlock, LoadingBlock, Pagination, StatusPill, Tabs } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { proposalsApi } from '@/services/commercial.service'
import { brl, formatInstant, phoneDisplay, CONTACT_TYPE, PROPOSAL_STATUS } from '@/lib/commercial'
import type { ProposalStatus } from '@/types/commercial'

type Filter = '' | ProposalStatus

export function ProposalsPage() {
  const [status, setStatus] = useState<Filter>('PENDING')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const openDetail = useDetail((s) => s.open)

  useEffect(() => { const h = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(h) }, [search])

  const { data, loading, error, reload } = useApiData(
    () => proposalsApi.list({ status: status || undefined, search: debounced, page, pageSize: 20 }),
    [status, debounced, page]
  )
  const counts = data?.counts ?? {}
  const total = Object.values(counts).reduce((a: number, b) => a + (b ?? 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Orçamentos" description="Entrada do fluxo comercial: do primeiro contato à aprovação"
        actions={<Button size="sm" variant="primary" leftIcon={<Plus size={13} />} onClick={() => setCreating(true)}>Novo orçamento</Button>} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1) }} items={[
          { value: 'PENDING', label: 'Aguardando', count: counts.PENDING ?? 0 },
          { value: 'APPROVED', label: 'Aprovados', count: counts.APPROVED ?? 0 },
          { value: 'REJECTED', label: 'Recusados', count: counts.REJECTED ?? 0 },
          { value: 'CANCELLED', label: 'Cancelados', count: counts.CANCELLED ?? 0 },
          { value: '', label: 'Todos', count: total },
        ]} />
        <div className="lg:w-80">
          <Input id="proposals-search" aria-label="Buscar orçamentos" placeholder="Buscar por contato, telefone ou serviço" value={search}
            onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <EmptyState icon={FileText} title="Nenhum orçamento nesta visão"
            description="Ao criar um orçamento, o contato é identificado ou cadastrado automaticamente."
            action={{ label: 'Novo orçamento', onClick: () => setCreating(true) }} />
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-dark-border">
            {data.items.map((p) => (
              <li key={p.id}>
                <button onClick={() => openDetail('proposal', p.id)}
                  className="w-full grid gap-2 sm:grid-cols-[1fr_auto_auto] items-center px-5 py-3.5 text-left hover:bg-dark-hover/40 focus-ring">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{p.title}</p>
                    <p className="text-xs text-white/40 truncate">
                      {p.contactName} · {phoneDisplay(p.contactPhone)}
                      {p.contact?.type ? ` · ${CONTACT_TYPE[p.contact.type].label}` : ''}
                      {p.serviceName ? ` · ${p.serviceName}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/75">{p.project ? brl(p.project.contractedValue) : brl(p.estimatedValue)}</p>
                    <p className="text-2xs text-white/30">{p.project ? 'contratado' : 'estimado'} · {formatInstant(p.createdAt, { dateStyle: 'short' })}</p>
                  </div>
                  <div className="sm:w-44 sm:text-right"><StatusPill {...PROPOSAL_STATUS[p.status]} /></div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </div>

      <ProposalFormModal open={creating} onClose={() => setCreating(false)} onSaved={(p) => openDetail('proposal', p.id)} />
    </div>
  )
}
