import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Ban, Pencil, Briefcase } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useApiData, useMutation } from '@/store/commercialSync.store'
import { proposalsApi } from '@/services/commercial.service'
import { brl, formatInstant, phoneDisplay, CONTACT_TYPE, PROPOSAL_STATUS, PROJECT_STATUS, PAYMENT_MODE } from '@/lib/commercial'
import { ConfirmDialog, ErrorBlock, HistoryList, InfoRow, LoadingBlock, Section, StatusPill } from './shared'
import { ApproveModal } from './ApproveModal'
import { ProposalFormModal } from './ProposalFormModal'

interface Props {
  proposalId: string | null
  onClose: () => void
  onOpenContact?: (id: string) => void
  onOpenProject?: (id: string) => void
}

type Confirm = 'reject' | 'reopen' | 'cancel' | null

export function ProposalDetailModal({ proposalId, onClose, onOpenContact, onOpenProject }: Props) {
  const { data: p, loading, error, reload } = useApiData(
    () => (proposalId ? proposalsApi.get(proposalId) : Promise.resolve(null)), [proposalId]
  )
  const [approving, setApproving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const { run } = useMutation()
  const toast = useToastStore()

  return (
    <Modal open={Boolean(proposalId)} onClose={onClose} size="lg" title={p?.title ?? 'Orçamento'}
      description={p ? `Criado em ${formatInstant(p.createdAt)}` : undefined}>
      {loading && !p && <LoadingBlock />}
      {error && <ErrorBlock message={error} onRetry={reload} />}
      {p && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill {...PROPOSAL_STATUS[p.status]} />
            <span className="flex-1" />
            {p.status === 'PENDING' && (
              <>
                <Button size="sm" variant="primary" leftIcon={<CheckCircle2 size={13} />} onClick={() => setApproving(true)}>Aprovar</Button>
                <Button size="sm" leftIcon={<Pencil size={13} />} onClick={() => setEditing(true)}>Editar</Button>
                <Button size="sm" variant="ghost" leftIcon={<XCircle size={13} />} onClick={() => setConfirm('reject')}>Recusar</Button>
              </>
            )}
            {p.status === 'REJECTED' && <Button size="sm" leftIcon={<RotateCcw size={13} />} onClick={() => setConfirm('reopen')}>Reabrir</Button>}
            {(p.status === 'PENDING' || p.status === 'REJECTED') && (
              <Button size="sm" variant="ghost" leftIcon={<Ban size={13} />} onClick={() => setConfirm('cancel')}>Cancelar</Button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Orçamento">
              <div>
                <InfoRow label="Contato">
                  <button className="text-loa-300 hover:underline focus-ring rounded" onClick={() => onOpenContact?.(p.contactId)}>{p.contactName}</button>
                </InfoRow>
                <InfoRow label="Telefone">{phoneDisplay(p.contactPhone)}</InfoRow>
                {p.contact?.type && <InfoRow label="Classificação atual"><StatusPill {...CONTACT_TYPE[p.contact.type]} /></InfoRow>}
                <InfoRow label="Serviço / pacote">{p.serviceName ?? 'A definir'}</InfoRow>
                <InfoRow label="Valor estimado">{brl(p.estimatedValue)}</InfoRow>
                {p.rejectionReason && <InfoRow label="Motivo da recusa">{p.rejectionReason}</InfoRow>}
              </div>
              {p.description && <p className="text-sm text-white/60 whitespace-pre-wrap">{p.description}</p>}
              <p className="text-2xs text-white/30">Valor estimado não é receita nem cobrança.</p>
            </Section>
            <Section title="Histórico">
              <div className="max-h-72 overflow-y-auto pr-1"><HistoryList items={p.history} /></div>
            </Section>
          </div>

          {p.project && (
            <Section title="Projeto oficializado">
              <button onClick={() => onOpenProject?.(p.project!.id)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-left hover:bg-emerald-500/10 focus-ring">
                <span className="flex items-center gap-2 min-w-0 text-sm text-white/80">
                  <Briefcase size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{p.project.name}</span>
                </span>
                <span className="text-xs text-white/50 shrink-0">{brl(p.project.contractedValue)} · {PAYMENT_MODE[p.project.paymentMode]} · {PROJECT_STATUS[p.project.status].label}</span>
              </button>
            </Section>
          )}
        </div>
      )}

      <ApproveModal open={approving} proposal={p} onClose={() => setApproving(false)}
        onApproved={(proj) => onOpenProject?.(proj.id)} />
      <ProposalFormModal open={editing} onClose={() => setEditing(false)} proposal={p} />
      <ConfirmDialog open={confirm === 'reject'} title="Recusar orçamento" reason="optional" danger confirmLabel="Recusar"
        description="O orçamento poderá ser reaberto depois." onClose={() => setConfirm(null)}
        onConfirm={async (reason) => { if (p) { await run(() => proposalsApi.reject(p.id, reason || undefined)); toast.success('Orçamento recusado.') } }} />
      <ConfirmDialog open={confirm === 'reopen'} title="Reabrir orçamento" reason="optional" confirmLabel="Reabrir"
        description="Volta para aguardando aprovação; a recusa anterior fica no histórico." onClose={() => setConfirm(null)}
        onConfirm={async (reason) => { if (p) { await run(() => proposalsApi.reopen(p.id, reason || undefined)); toast.success('Orçamento reaberto.') } }} />
      <ConfirmDialog open={confirm === 'cancel'} title="Cancelar orçamento" reason="optional" danger confirmLabel="Cancelar orçamento"
        description="Orçamentos cancelados não podem ser reabertos nem aprovados." onClose={() => setConfirm(null)}
        onConfirm={async (reason) => { if (p) { await run(() => proposalsApi.cancel(p.id, reason || undefined)); toast.success('Orçamento cancelado.') } }} />
    </Modal>
  )
}
