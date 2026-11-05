import { useState } from 'react'
import { Pencil, UserCheck, Archive, ArchiveRestore, FilePlus2, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useApiData, useMutation } from '@/store/commercialSync.store'
import { contactsApi } from '@/services/commercial.service'
import { buildWhatsappLink } from '@/lib/utils'
import {
  brl, formatDay, formatInstant, phoneDisplay, CONTACT_TYPE, PROPOSAL_STATUS, PROJECT_STATUS, PAYMENT_MODE,
} from '@/lib/commercial'
import { ConfirmDialog, ErrorBlock, HistoryList, InfoRow, LoadingBlock, Section, StatusPill } from './shared'
import { ContactFormModal } from './ContactFormModal'
import { ProposalFormModal } from './ProposalFormModal'
import { ReceivablesTable } from './ReceivablesTable'

interface Props {
  contactId: string | null
  onClose: () => void
  onOpenProposal?: (id: string) => void
  onOpenProject?: (id: string) => void
}

export function ContactDetailModal({ contactId, onClose, onOpenProposal, onOpenProject }: Props) {
  const { data: c, loading, error, reload } = useApiData(
    () => (contactId ? contactsApi.get(contactId) : Promise.resolve(null)), [contactId]
  )
  const [editing, setEditing] = useState(false)
  const [newProposal, setNewProposal] = useState(false)
  const [confirm, setConfirm] = useState<'convert' | 'archive' | null>(null)
  const { run } = useMutation()
  const toast = useToastStore()

  return (
    <Modal open={Boolean(contactId)} onClose={onClose} size="xl" title={c?.name ?? 'Contato'}
      description={c ? `${CONTACT_TYPE[c.type].label} · cadastrado em ${formatInstant(c.createdAt, { dateStyle: 'short' })}` : undefined}>
      {loading && !c && <LoadingBlock />}
      {error && <ErrorBlock message={error} onRetry={reload} />}
      {c && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" leftIcon={<FilePlus2 size={13} />} onClick={() => setNewProposal(true)} disabled={Boolean(c.archivedAt)}>Novo orçamento</Button>
            <Button size="sm" leftIcon={<Pencil size={13} />} onClick={() => setEditing(true)}>Editar</Button>
            {c.type === 'PROSPECT' && <Button size="sm" leftIcon={<UserCheck size={13} />} onClick={() => setConfirm('convert')}>Converter em cliente</Button>}
            {c.archivedAt
              ? <Button size="sm" variant="ghost" leftIcon={<ArchiveRestore size={13} />} onClick={async () => { await run(() => contactsApi.unarchive(c.id)); toast.success('Contato reativado.') }}>Reativar</Button>
              : <Button size="sm" variant="ghost" leftIcon={<Archive size={13} />} onClick={() => setConfirm('archive')}>Arquivar</Button>}
            <a href={buildWhatsappLink(c.phoneNormalized)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-dark-border text-white/70 hover:text-white focus-ring">
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>

          {c.possibleDuplicates.length > 0 && (
            <div role="note" className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200/90">
              Possíveis duplicidades: {c.possibleDuplicates.map((d) => `${d.name} (${phoneDisplay(d.phone)})`).join(', ')}. Nada foi mesclado automaticamente.
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Dados">
              <div>
                <InfoRow label="Classificação"><StatusPill {...CONTACT_TYPE[c.type]} /></InfoRow>
                <InfoRow label="Telefone">{phoneDisplay(c.phone)}</InfoRow>
                <InfoRow label="E-mail">{c.email ?? '—'}</InfoRow>
                <InfoRow label="Origem">{c.source ?? '—'}</InfoRow>
                <InfoRow label="Convertido em">{c.convertedAt ? formatInstant(c.convertedAt, { dateStyle: 'short' }) : '—'}</InfoRow>
                {c.archivedAt && <InfoRow label="Arquivado em">{formatInstant(c.archivedAt, { dateStyle: 'short' })}</InfoRow>}
              </div>
              {c.notes && <p className="text-sm text-white/60 whitespace-pre-wrap">{c.notes}</p>}
            </Section>
            <Section title="Histórico">
              <div className="max-h-64 overflow-y-auto pr-1"><HistoryList items={c.history} /></div>
            </Section>
          </div>

          <Section title={`Orçamentos (${c.proposals.length})`}>
            {c.proposals.length === 0 ? <p className="text-xs text-white/30">Nenhum orçamento.</p> : (
              <ul className="divide-y divide-dark-border rounded-xl border border-dark-border">
                {c.proposals.map((p) => (
                  <li key={p.id}>
                    <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-dark-hover focus-ring"
                      onClick={() => onOpenProposal?.(p.id)}>
                      <span className="min-w-0">
                        <span className="block text-sm text-white/80 truncate">{p.title}</span>
                        <span className="text-xs text-white/35">{formatInstant(p.createdAt, { dateStyle: 'short' })} · estimado {brl(p.estimatedValue)}</span>
                      </span>
                      <StatusPill {...PROPOSAL_STATUS[p.status]} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Projetos (${c.projects.length})`}>
            {c.projects.length === 0 ? <p className="text-xs text-white/30">Nenhum projeto oficializado.</p> : (
              <ul className="divide-y divide-dark-border rounded-xl border border-dark-border">
                {c.projects.map((p) => (
                  <li key={p.id}>
                    <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-dark-hover focus-ring" onClick={() => onOpenProject?.(p.id)}>
                      <span className="min-w-0">
                        <span className="block text-sm text-white/80 truncate">{p.name}</span>
                        <span className="text-xs text-white/35">{p.serviceName} · {brl(p.contractedValue)}{p.paymentMode === 'RECURRING' ? '/mês' : ''} · {PAYMENT_MODE[p.paymentMode]}{p.dueDate ? ` · entrega ${formatDay(p.dueDate)}` : ''}</span>
                      </span>
                      <StatusPill {...PROJECT_STATUS[p.status]} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Cobranças">
            <div className="rounded-xl border border-dark-border overflow-hidden">
              <ReceivablesTable items={c.receivables.map((r) => ({ ...r, contact: { id: c.id, name: c.name } }))} showContact={false} showProject={false} />
            </div>
          </Section>
        </div>
      )}

      <ContactFormModal open={editing} onClose={() => setEditing(false)} contact={c} />
      <ProposalFormModal open={newProposal} onClose={() => setNewProposal(false)} presetContact={c ? { id: c.id, name: c.name, phone: c.phone, type: c.type } : null} />
      <ConfirmDialog open={confirm === 'convert'} title="Converter em cliente" confirmLabel="Converter"
        description="A data de conversão será registrada." onClose={() => setConfirm(null)}
        onConfirm={async () => { if (c) { await run(() => contactsApi.convert(c.id)); toast.success('Prospect convertido em cliente.') } }} />
      <ConfirmDialog open={confirm === 'archive'} title="Arquivar contato" confirmLabel="Arquivar" danger
        description="O contato deixa de aparecer na listagem padrão. O histórico é preservado." onClose={() => setConfirm(null)}
        onConfirm={async () => { if (c) { await run(() => contactsApi.archive(c.id)); toast.success('Contato arquivado.') } }} />
    </Modal>
  )
}
