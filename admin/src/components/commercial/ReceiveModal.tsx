import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { receivablesApi, apiErrorInfo } from '@/services/commercial.service'
import { brl, formatDay, methodOptions, parseMoneyToCents, todayKey } from '@/lib/commercial'
import { FormError, InfoRow } from './shared'
import type { PaymentMethod, Receivable } from '@/types/commercial'

interface Props { open: boolean; receivable: Receivable | null; onClose: () => void }

/** Registro manual de recebimento: só confirma após a API gravar a baixa. */
export function ReceiveModal({ open, receivable, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [date, setDate] = useState(todayKey())
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { busy, run } = useMutation()
  const toast = useToastStore()

  useEffect(() => {
    if (!open || !receivable) return
    setMethod(receivable.paymentMethod ?? '')
    setDate(todayKey())
    setAmount(receivable.amount.toFixed(2).replace('.', ','))
    setNotes('')
    setError(null)
  }, [open, receivable])

  const submit = async () => {
    if (!receivable) return
    setError(null)
    if (!method) { setError('Selecione a forma de pagamento.'); return }
    const cents = parseMoneyToCents(amount)
    if (!cents || cents <= 0) { setError('Valor recebido inválido.'); return }
    if (date > todayKey()) { setError('A data do recebimento não pode ser futura.'); return }
    const differs = cents !== Math.round(receivable.amount * 100)
    if (differs && !notes.trim()) { setError('Valor diferente do previsto: explique nas observações.'); return }
    try {
      const done = await run(() => receivablesApi.receive(receivable.id, {
        method, receivedAt: date, receivedAmount: cents / 100, notes: notes.trim() || null,
      }))
      if (!done) return
      toast.success('Recebimento registrado.', `${brl(cents / 100)} lançado no financeiro.`)
      onClose()
    } catch (err) {
      setError(apiErrorInfo(err).message)
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="sm" title="Registrar recebimento"
      description="Confirme somente valores efetivamente recebidos."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={submit}>Confirmar recebimento</Button>
        </div>
      }>
      {receivable && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <div>
            <InfoRow label="Cobrança">{receivable.description}</InfoRow>
            <InfoRow label="Contato">{receivable.contact?.name ?? '—'}</InfoRow>
            <InfoRow label="Vencimento">{formatDay(receivable.dueDate)}</InfoRow>
            <InfoRow label="Valor previsto">{brl(receivable.amount)}</InfoRow>
          </div>
          <Select id="receive-method" label="Forma de pagamento" value={method} required
            onChange={(e) => setMethod(e.target.value as PaymentMethod | '')} options={[{ value: '', label: 'Selecione…' }, ...methodOptions]} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="receive-date" type="date" label="Data do recebimento" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
            <Input id="receive-amount" label="Valor recebido" value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Textarea id="receive-notes" label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <FormError message={error} />
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  )
}
