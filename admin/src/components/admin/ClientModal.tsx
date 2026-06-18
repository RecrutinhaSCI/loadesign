import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToastStore } from '@/store/toast.store'
import { useClientsStore } from '@/store/clients.store'
import type { Client } from '@/types'

interface ClientModalProps {
  open: boolean
  onClose: () => void
  client?: Client | null
}

const empty = {
  name: '',
  email: '',
  phone: '',
  company: '',
  instagram: '',
  notes: '',
}

export function ClientModal({ open, onClose, client }: ClientModalProps) {
  const toast = useToastStore()
  const { add, update } = useClientsStore()
  const isEdit = !!client
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company ?? '',
        instagram: client.instagram ?? '',
        notes: client.notes ?? '',
      })
    } else setForm(empty)
  }, [client, open])

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Preencha nome e e-mail.')
      return
    }
    if (isEdit && client) {
      update(client.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        company: form.company || null,
        instagram: form.instagram || null,
        notes: form.notes || null,
      })
      toast.success('Cliente atualizado.')
    } else {
      add({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        company: form.company || null,
        instagram: form.instagram || null,
        notes: form.notes || null,
        totalProjects: 0,
        totalRevenue: 0,
      })
      toast.success('Cliente criado com sucesso!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      description={isEdit ? 'Atualize os dados deste cliente.' : 'Cadastre um novo cliente da agência.'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
            {isEdit ? 'Salvar' : 'Criar cliente'}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bruna Tavares" />
        <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@dominio.com" />
        <Input label="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
        <Input label="Empresa / Marca" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex: Nutê Ateliê" />
        <Input label="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Notas internas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalhes do relacionamento, preferências, etc." rows={3} />
        </div>
      </div>
    </Modal>
  )
}
