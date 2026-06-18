import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToastStore } from '@/store/toast.store'
import { useLeadsStore } from '@/store/leads.store'
import type { Lead, LeadSource, LeadStatus } from '@/types'

interface LeadFormModalProps {
  open: boolean
  onClose: () => void
  lead?: Lead | null
}

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'social',   label: 'Instagram / Social' },
  { value: 'organic',  label: 'Busca orgânica' },
  { value: 'referral', label: 'Indicação' },
  { value: 'paid',     label: 'Tráfego pago' },
  { value: 'email',    label: 'E-mail' },
  { value: 'other',    label: 'Outro' },
]

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new',       label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal',  label: 'Orçamento enviado' },
  { value: 'won',       label: 'Fechado' },
  { value: 'lost',      label: 'Perdido' },
]

const SERVICE_OPTIONS = [
  'Pacote Básico',
  'Pacote Intermediário',
  'Pacote Avançado',
  'Artes para redes sociais',
  'Gestão de Instagram',
  'Branding básico',
  'Identidade Visual',
  'Edição de Reels',
  'Estratégia visual',
]

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service: 'Pacote Intermediário',
  source: 'social' as LeadSource,
  status: 'new' as LeadStatus,
  value: 450,
  notes: '',
}

export function LeadFormModal({ open, onClose, lead }: LeadFormModalProps) {
  const toast = useToastStore()
  const { add, update } = useLeadsStore()
  const isEdit = !!lead
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (lead) {
      setForm({
        name:    lead.name,
        email:   lead.email,
        phone:   lead.phone ?? '',
        company: lead.company ?? '',
        service: lead.service,
        source:  lead.source,
        status:  lead.status,
        value:   lead.value,
        notes:   lead.notes ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [lead, open])

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Preencha pelo menos nome e e-mail.')
      return
    }
    if (isEdit && lead) {
      update(lead.id, {
        name:    form.name.trim(),
        email:   form.email.trim(),
        phone:   form.phone || null,
        company: form.company || null,
        service: form.service,
        source:  form.source,
        status:  form.status,
        value:   Number(form.value) || 0,
        notes:   form.notes || null,
      })
      toast.success('Lead atualizado.')
    } else {
      add({
        name:    form.name.trim(),
        email:   form.email.trim(),
        phone:   form.phone || null,
        company: form.company || null,
        website: null,
        source:  form.source,
        status:  form.status,
        service: form.service,
        score:   50,
        value:   Number(form.value) || 0,
        notes:   form.notes || null,
        tags:    [],
        assignedTo: null,
        lastContactAt: null,
      })
      toast.success('Lead criado com sucesso!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar lead' : 'Novo lead'}
      description={isEdit ? 'Atualize os dados deste lead.' : 'Cadastre um novo contato no funil.'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
            {isEdit ? 'Salvar alterações' : 'Criar lead'}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Mariana Costa" />
        <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@dominio.com" />
        <Input label="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
        <Input label="Empresa / Marca" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex: Coach Mariana" />
        <Select label="Serviço de interesse" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} options={SERVICE_OPTIONS.map((s) => ({ value: s, label: s }))} />
        <Select label="Origem" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })} options={SOURCE_OPTIONS} />
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })} options={STATUS_OPTIONS} />
        <Input label="Valor estimado (R$)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="450" />
        <div className="sm:col-span-2">
          <Textarea label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Quer começar pelo básico, indicada pela Mari..." rows={3} />
        </div>
      </div>
    </Modal>
  )
}
