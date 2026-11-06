import { useState } from 'react'
import { CheckCircle2, Undo2, Ban, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { receivablesApi, apiErrorInfo } from '@/services/commercial.service'
import { brl, formatDay, isOverdue, PAYMENT_METHOD, RECEIVABLE_STATUS } from '@/lib/commercial'
import { ConfirmDialog, FormError, StatusPill } from './shared'
import { ReceiveModal } from './ReceiveModal'
import type { Receivable } from '@/types/commercial'

interface Props {
  items: Receivable[]
  showContact?: boolean
  showProject?: boolean
  emptyLabel?: string
}

type Action = { kind: 'reverse' | 'cancel'; r: Receivable } | null

export function ReceivablesTable({ items, showContact = true, showProject = true, emptyLabel = 'Nenhuma cobrança.' }: Props) {
  const [receiving, setReceiving] = useState<Receivable | null>(null)
  const [action, setAction] = useState<Action>(null)
  const [rescheduling, setRescheduling] = useState<Receivable | null>(null)
  const toast = useToastStore()
  const { run } = useMutation()

  if (!items.length) return <p className="px-5 py-8 text-center text-sm text-white/35">{emptyLabel}</p>

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-2xs uppercase tracking-wider text-white/35 bg-dark-muted/30">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
              <th className="px-4 py-2.5 text-left font-medium">Descrição</th>
              {showContact && <th className="px-4 py-2.5 text-left font-medium">Contato</th>}
              {showProject && <th className="px-4 py-2.5 text-left font-medium">Projeto</th>}
              <th className="px-4 py-2.5 text-right font-medium">Valor</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const st = isOverdue(r) ? RECEIVABLE_STATUS.OVERDUE : RECEIVABLE_STATUS[r.status]
              return (
                <tr key={r.id} className="border-t border-dark-border hover:bg-dark-hover/40">
                  <td className="px-4 py-2.5 whitespace-nowrap text-white/70">{formatDay(r.dueDate)}</td>
                  <td className="px-4 py-2.5 text-white/80 min-w-[180px]">
                    {r.description}
                    {r.status === 'RECEIVED' && (
                      <p className="text-2xs text-emerald-400/70">
                        Recebido {brl(r.receivedAmount)} em {formatDay(r.receivedAt)}{r.paymentMethod ? ` · ${PAYMENT_METHOD[r.paymentMethod]}` : ''}
                      </p>
                    )}
                    {r.status === 'CANCELLED' && r.cancelReason && <p className="text-2xs text-white/30">{r.cancelReason}</p>}
                  </td>
                  {showContact && <td className="px-4 py-2.5 text-white/60">{r.contact?.name ?? '—'}</td>}
                  {showProject && <td className="px-4 py-2.5 text-white/60">{r.project?.name ?? '—'}</td>}
                  <td className="px-4 py-2.5 text-right whitespace-nowrap text-white/85">{brl(r.amount)}</td>
                  <td className="px-4 py-2.5"><StatusPill {...st} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {r.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" leftIcon={<CheckCircle2 size={12} />} onClick={() => setReceiving(r)}>Receber</Button>
                          <Button size="icon" variant="ghost" title="Alterar vencimento" aria-label="Alterar vencimento" onClick={() => setRescheduling(r)}><CalendarClock size={13} /></Button>
                          <Button size="icon" variant="ghost" title="Cancelar cobrança" aria-label="Cancelar cobrança" onClick={() => setAction({ kind: 'cancel', r })}><Ban size={13} /></Button>
                        </>
                      )}
                      {r.status === 'RECEIVED' && (
                        <Button size="sm" variant="ghost" leftIcon={<Undo2 size={12} />} onClick={() => setAction({ kind: 'reverse', r })}>Estornar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ReceiveModal open={Boolean(receiving)} receivable={receiving} onClose={() => setReceiving(null)} />

      <ConfirmDialog
        open={action?.kind === 'cancel'}
        title="Cancelar cobrança"
        description={action ? `${action.r.description} — ${brl(action.r.amount)}` : undefined}
        reason="required" danger confirmLabel="Cancelar cobrança"
        onClose={() => setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return
          await run(() => receivablesApi.cancel(action.r.id, reason))
          toast.success('Cobrança cancelada.', 'O registro foi mantido no histórico.')
        }}
      />
      <ConfirmDialog
        open={action?.kind === 'reverse'}
        title="Estornar recebimento"
        description="A cobrança volta a ficar pendente e um lançamento de estorno é registrado."
        reason="required" danger confirmLabel="Estornar"
        onClose={() => setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return
          await run(() => receivablesApi.reverse(action.r.id, reason))
          toast.success('Recebimento estornado.')
        }}
      />
      <RescheduleModal receivable={rescheduling} onClose={() => setRescheduling(null)} onError={(m) => toast.error('Erro', m)} />
    </>
  )
}

function RescheduleModal({ receivable, onClose, onError }: { receivable: Receivable | null; onClose: () => void; onError: (m: string) => void }) {
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { busy, run } = useMutation()
  const toast = useToastStore()
  const open = Boolean(receivable)

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="sm" title="Alterar vencimento"
      description={receivable ? `${receivable.description} — atual: ${formatDay(receivable.dueDate)}` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={async () => {
            if (!receivable) return
            if (!date) { setError('Informe a nova data.'); return }
            try {
              const r = await run(() => receivablesApi.update(receivable.id, { dueDate: date }))
              if (r) { toast.success('Vencimento alterado.'); setDate(''); onClose() }
            } catch (err) { const m = apiErrorInfo(err).message; setError(m); onError(m) }
          }}>Salvar</Button>
        </div>
      }>
      <div className="space-y-3">
        <Input id="reschedule-date" type="date" label="Novo vencimento" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        <FormError message={error} />
      </div>
    </Modal>
  )
}
