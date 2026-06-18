import { useEffect, useMemo, useState } from 'react'
import { Save, Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToastStore } from '@/store/toast.store'
import { useQuotesStore } from '@/store/quotes.store'
import { formatCurrency } from '@/lib/utils'
import type { Quote, QuoteItem, QuoteStatus } from '@/types'

interface QuoteModalProps {
  open: boolean
  onClose: () => void
  quote?: Quote | null
}

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft',    label: 'Rascunho'         },
  { value: 'sent',     label: 'Enviado'          },
  { value: 'accepted', label: 'Aceito'           },
  { value: 'rejected', label: 'Recusado'         },
  { value: 'expired',  label: 'Expirado'         },
]

const emptyItem: QuoteItem = { description: '', quantity: 1, unitPrice: 0 }
const toDateInput = (iso: string) => iso.slice(0, 10)

const empty = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  status: 'draft' as QuoteStatus,
  items: [emptyItem],
  discount: 0,
  notes: '',
  validUntil: toDateInput(new Date(Date.now() + 7 * 86400000).toISOString()),
}

export function QuoteModal({ open, onClose, quote }: QuoteModalProps) {
  const toast = useToastStore()
  const { add, update } = useQuotesStore()
  const isEdit = !!quote
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (quote) {
      setForm({
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        clientPhone: quote.clientPhone,
        status: quote.status,
        items: quote.items.length ? quote.items : [emptyItem],
        discount: quote.discount,
        notes: quote.notes ?? '',
        validUntil: toDateInput(quote.validUntil),
      })
    } else setForm(empty)
  }, [quote, open])

  const subtotal = useMemo(
    () => form.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [form.items]
  )
  const total = Math.max(0, subtotal - (Number(form.discount) || 0))

  const updateItem = (idx: number, patch: Partial<QuoteItem>) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], ...patch }
    setForm({ ...form, items })
  }
  const addRow = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] })
  const removeRow = (idx: number) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })

  const handleSubmit = () => {
    if (!form.clientName.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }
    const cleanItems = form.items.filter((i) => i.description.trim() && i.unitPrice > 0)
    if (cleanItems.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento.')
      return
    }
    const payload = {
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientPhone: form.clientPhone.trim(),
      status: form.status,
      items: cleanItems,
      discount: Number(form.discount) || 0,
      total,
      notes: form.notes || null,
      validUntil: new Date(form.validUntil).toISOString(),
    }
    if (isEdit && quote) {
      update(quote.id, payload)
      toast.success('Orçamento atualizado.')
    } else {
      add(payload)
      toast.success('Orçamento criado!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Editar orçamento' : 'Novo orçamento'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-white/40">Total: </span>
            <span className="font-semibold text-loa-400">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
              {isEdit ? 'Salvar' : 'Criar orçamento'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Cliente *" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Ex: Studio CR Estética" />
          <Input label="E-mail" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
          <Input label="WhatsApp" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="(00) 00000-0000" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuoteStatus })} options={STATUS_OPTIONS} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-white/50 tracking-wide uppercase">Itens do orçamento</label>
            <Button variant="ghost" size="sm" leftIcon={<Plus size={12} />} onClick={addRow}>Adicionar item</Button>
          </div>

          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <Input value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Descrição do item" />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} placeholder="Qtd" />
                </div>
                <div className="col-span-3">
                  <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} placeholder="Preço unit." />
                </div>
                <div className="col-span-1 flex items-center justify-center pt-2">
                  {form.items.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-white/30 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-4 text-sm">
            <span className="text-white/40">Subtotal:</span>
            <span className="text-white/70 font-medium w-24 text-right">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Desconto (R$)" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
          <Input label="Válido até" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </div>

        <Textarea label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Condições, prazo, formas de pagamento..." />
      </div>
    </Modal>
  )
}
