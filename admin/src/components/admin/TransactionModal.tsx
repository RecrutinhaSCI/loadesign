import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToastStore } from '@/store/toast.store'
import { useTransactionsStore } from '@/store/transactions.store'
import type { Transaction, TransactionType } from '@/types'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'income',  label: 'Receita'  },
  { value: 'expense', label: 'Despesa' },
]

const CATEGORY_OPTIONS = ['Recebimento', 'Software', 'Conteúdo', 'Marketing', 'Imposto', 'Outros']

const toDateInput = (iso: string) => iso.slice(0, 10)

const empty = {
  description: '',
  client: '',
  type: 'income' as TransactionType,
  value: 0,
  date: toDateInput(new Date().toISOString()),
  category: 'Recebimento',
}

export function TransactionModal({ open, onClose, transaction }: TransactionModalProps) {
  const toast = useToastStore()
  const { add, update } = useTransactionsStore()
  const isEdit = !!transaction
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        client: transaction.client,
        type: transaction.type,
        value: transaction.value,
        date: toDateInput(transaction.date),
        category: transaction.category,
      })
    } else setForm(empty)
  }, [transaction, open])

  const handleSubmit = () => {
    if (!form.description.trim() || !form.value) {
      toast.error('Preencha descrição e valor.')
      return
    }
    const payload = {
      description: form.description.trim(),
      client: form.client || '—',
      type: form.type,
      value: Number(form.value),
      date: new Date(form.date).toISOString(),
      category: form.category,
    }
    if (isEdit && transaction) {
      update(transaction.id, payload)
      toast.success('Transação atualizada.')
    } else {
      add(payload)
      toast.success('Transação registrada!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Editar transação' : 'Nova transação'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
            {isEdit ? 'Salvar' : 'Registrar'}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Descrição *" className="sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Pacote Básico · Cliente X" />
        <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} options={TYPE_OPTIONS} />
        <Select label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        <Input label="Valor (R$)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input label="Cliente (opcional)" className="sm:col-span-2" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Nome do cliente" />
      </div>
    </Modal>
  )
}
