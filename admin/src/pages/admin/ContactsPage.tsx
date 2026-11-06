import { useEffect, useState } from 'react'
import { Plus, Search, Users, DownloadCloud } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactFormModal } from '@/components/commercial/ContactFormModal'
import { LegacyImportModal } from '@/components/commercial/LegacyImportModal'
import { useDetail } from '@/components/commercial/DetailHost'
import { ErrorBlock, LoadingBlock, Pagination, StatusPill } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { contactsApi } from '@/services/commercial.service'
import { CONTACT_TYPE, formatInstant, phoneDisplay } from '@/lib/commercial'

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [type, setType] = useState('')
  const [archived, setArchived] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const openDetail = useDetail((s) => s.open)

  useEffect(() => { const h = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(h) }, [search])

  const { data, loading, error, reload } = useApiData(
    () => contactsApi.list({ search: debounced, type, archived: archived || undefined, page, pageSize: 20 }),
    [debounced, type, archived, page]
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Contatos" description="Clientes e prospects em um cadastro único"
        actions={
          <>
            <Button size="sm" variant="ghost" leftIcon={<DownloadCloud size={13} />} onClick={() => setImporting(true)}>Importar legados</Button>
            <Button size="sm" variant="primary" leftIcon={<Plus size={13} />} onClick={() => setCreating(true)}>Novo contato</Button>
          </>
        } />

      <div className="card p-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input id="contacts-search" aria-label="Buscar contatos" placeholder="Buscar por nome, telefone ou e-mail" value={search}
          onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} />
        <Select id="contacts-type" aria-label="Filtrar por classificação" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'Todos' }, { value: 'CLIENT', label: 'Clientes' }, { value: 'PROSPECT', label: 'Prospects' }]} />
        <Select id="contacts-archived" aria-label="Filtrar arquivados" value={archived} onChange={(e) => { setArchived(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'Ativos' }, { value: 'true', label: 'Arquivados' }, { value: 'all', label: 'Ativos e arquivados' }]} />
      </div>

      <div className="card overflow-hidden">
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <EmptyState icon={Users} title={debounced || type ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
            description="Cadastre clientes e prospects, ou crie um orçamento — o contato é criado junto."
            action={{ label: 'Novo contato', onClick: () => setCreating(true) }} />
        )}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-2xs uppercase tracking-wider text-white/35 bg-dark-muted/30">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                  <th className="px-4 py-2.5 text-left font-medium">Telefone</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">E-mail</th>
                  <th className="px-4 py-2.5 text-left font-medium">Classificação</th>
                  <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Orçamentos</th>
                  <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Projetos</th>
                  <th className="px-4 py-2.5 text-right font-medium hidden lg:table-cell">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-t border-dark-border hover:bg-dark-hover/40 cursor-pointer" onClick={() => openDetail('contact', c.id)}>
                    <td className="px-4 py-2.5">
                      <button className="text-white/85 hover:text-loa-300 font-medium focus-ring rounded text-left" onClick={(e) => { e.stopPropagation(); openDetail('contact', c.id) }}>
                        {c.name}
                      </button>
                      {c.archivedAt && <span className="ml-2 text-2xs text-white/30">arquivado</span>}
                    </td>
                    <td className="px-4 py-2.5 text-white/60 whitespace-nowrap">{phoneDisplay(c.phone)}</td>
                    <td className="px-4 py-2.5 text-white/50 hidden md:table-cell">{c.email ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusPill {...CONTACT_TYPE[c.type]} /></td>
                    <td className="px-4 py-2.5 text-right text-white/60 hidden sm:table-cell">{c._count?.proposals ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-white/60 hidden sm:table-cell">{c._count?.projects ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-white/35 hidden lg:table-cell">{formatInstant(c.updatedAt, { dateStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </div>

      <ContactFormModal open={creating} onClose={() => setCreating(false)} onSaved={(c) => openDetail('contact', c.id)} />
      <LegacyImportModal open={importing} onClose={() => setImporting(false)} />
    </div>
  )
}
