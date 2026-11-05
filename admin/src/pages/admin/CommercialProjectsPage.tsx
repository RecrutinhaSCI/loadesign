import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Briefcase, Hourglass, ArrowRight, Archive } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDetail } from '@/components/commercial/DetailHost'
import { ErrorBlock, LoadingBlock, Pagination, StatusPill, Tabs } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { proposalsApi, workProjectsApi } from '@/services/commercial.service'
import { brl, formatDay, formatInstant, PAYMENT_MODE, PROJECT_STATUS, PROPOSAL_STATUS } from '@/lib/commercial'

type View = 'ACTIVE' | 'DONE' | 'CANCELLED' | ''

/**
 * Projetos: fila "aguardando aprovação" (orçamentos pendentes, ainda NÃO são
 * contratos) + projetos oficializados a partir de orçamentos aprovados.
 */
export function CommercialProjectsPage() {
  const [view, setView] = useState<View>('ACTIVE')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const openDetail = useDetail((s) => s.open)

  useEffect(() => { const h = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(h) }, [search])

  const pending = useApiData(() => proposalsApi.list({ status: 'PENDING', pageSize: 12 }), [])
  const projects = useApiData(
    () => workProjectsApi.list({ status: view || undefined, search: debounced, page, pageSize: 20 }),
    [view, debounced, page]
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Projetos" description="Orçamentos aguardando aprovação e projetos oficializados"
        actions={<Link to="/legacy/projects" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 focus-ring rounded"><Archive size={12} /> Projetos legados</Link>} />

      {/* Fila de aprovação */}
      <section aria-labelledby="pipeline-title" className="card">
        <div className="px-5 py-3.5 border-b border-dark-border flex items-center justify-between gap-2">
          <h2 id="pipeline-title" className="text-sm font-semibold text-white/75 flex items-center gap-2">
            <Hourglass size={14} className="text-amber-300" /> Aguardando aprovação
            <span className="text-white/30 font-normal">({pending.data?.meta.total ?? 0})</span>
          </h2>
          <Link to="/proposals" className="text-xs text-loa-400 hover:underline inline-flex items-center gap-1">Ver orçamentos <ArrowRight size={11} /></Link>
        </div>
        {pending.loading && !pending.data && <LoadingBlock />}
        {pending.error && <ErrorBlock message={pending.error} onRetry={pending.reload} />}
        {pending.data && pending.data.items.length === 0 && <p className="px-5 py-6 text-sm text-white/35">Nenhum orçamento pendente.</p>}
        {pending.data && pending.data.items.length > 0 && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {pending.data.items.map((p) => (
              <button key={p.id} onClick={() => openDetail('proposal', p.id)}
                className="text-left rounded-xl border border-dashed border-amber-500/25 bg-amber-500/[0.03] p-3.5 hover:border-amber-500/45 focus-ring">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white/80 line-clamp-2">{p.title}</p>
                  <StatusPill {...PROPOSAL_STATUS.PENDING} />
                </div>
                <p className="text-xs text-white/40 mt-1">{p.contactName}{p.serviceName ? ` · ${p.serviceName}` : ''}</p>
                <p className="text-xs text-white/35 mt-2">Estimado: {brl(p.estimatedValue)} <span className="text-white/25">(não contratado)</span></p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Projetos oficializados */}
      <section aria-labelledby="projects-title" className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <h2 id="projects-title" className="sr-only">Projetos oficializados</h2>
          <Tabs value={view} onChange={(v) => { setView(v); setPage(1) }} items={[
            { value: 'ACTIVE', label: 'Ativos' }, { value: 'DONE', label: 'Entregues' },
            { value: 'CANCELLED', label: 'Cancelados' }, { value: '', label: 'Todos' },
          ]} />
          <div className="lg:w-80">
            <Input id="projects-search" aria-label="Buscar projetos" placeholder="Buscar por projeto, serviço ou contato" value={search}
              onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} />
          </div>
        </div>

        <div className="card overflow-hidden">
          {projects.loading && !projects.data && <LoadingBlock />}
          {projects.error && <ErrorBlock message={projects.error} onRetry={projects.reload} />}
          {projects.data && projects.data.items.length === 0 && (
            <EmptyState icon={Briefcase} title="Nenhum projeto nesta visão" description="Projetos são oficializados ao aprovar um orçamento." />
          )}
          {projects.data && projects.data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-2xs uppercase tracking-wider text-white/35 bg-dark-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Projeto</th>
                    <th className="px-4 py-2.5 text-left font-medium">Contato</th>
                    <th className="px-4 py-2.5 text-right font-medium">Contratado</th>
                    <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">A receber</th>
                    <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">Recebido</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Entrega</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.data.items.map((p) => (
                    <tr key={p.id} className="border-t border-dark-border hover:bg-dark-hover/40 cursor-pointer" onClick={() => openDetail('project', p.id)}>
                      <td className="px-4 py-2.5">
                        <button className="text-white/85 font-medium hover:text-loa-300 focus-ring rounded text-left" onClick={(e) => { e.stopPropagation(); openDetail('project', p.id) }}>{p.name}</button>
                        <p className="text-2xs text-white/35">{p.serviceName} · {PAYMENT_MODE[p.paymentMode]} · desde {formatInstant(p.createdAt, { dateStyle: 'short' })}</p>
                      </td>
                      <td className="px-4 py-2.5 text-white/60">{p.contact?.name}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap text-white/80">{brl(p.contractedValue)}{p.paymentMode === 'RECURRING' ? '/mês' : ''}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap text-amber-300/80 hidden md:table-cell">{brl(p.finance?.pending ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap text-emerald-400/80 hidden md:table-cell">{brl(p.finance?.received ?? 0)}</td>
                      <td className="px-4 py-2.5 text-white/50 hidden lg:table-cell">{p.dueDate ? formatDay(p.dueDate) : 'Sem prazo'}</td>
                      <td className="px-4 py-2.5"><StatusPill {...PROJECT_STATUS[p.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination meta={projects.data?.meta} onPage={setPage} />
        </div>
      </section>
    </div>
  )
}
