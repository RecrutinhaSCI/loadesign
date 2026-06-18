import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToastStore } from '@/store/toast.store'
import { useProjectsStore } from '@/store/projects.store'
import { useClientsStore } from '@/store/clients.store'
import type { Project, ProjectStatusKey } from '@/types'

interface ProjectModalProps {
  open: boolean
  onClose: () => void
  project?: Project | null
}

const STATUS_OPTIONS: { value: ProjectStatusKey; label: string }[] = [
  { value: 'DRAFT',       label: 'Rascunho'      },
  { value: 'IN_PROGRESS', label: 'Em andamento'  },
  { value: 'REVIEW',      label: 'Em revisão'    },
  { value: 'DONE',        label: 'Entregue'      },
  { value: 'CANCELLED',   label: 'Cancelado'     },
]

const toDateInput = (iso: string) => iso.slice(0, 10)

const empty = {
  name: '',
  clientId: '',
  client: '',
  status: 'DRAFT' as ProjectStatusKey,
  progress: 0,
  value: 450,
  deadline: toDateInput(new Date(Date.now() + 30 * 86400000).toISOString()),
  description: '',
}

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const toast = useToastStore()
  const { add, update } = useProjectsStore()
  const { items: clients } = useClientsStore()
  const isEdit = !!project
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        clientId: project.clientId ?? '',
        client: project.client,
        status: project.status,
        progress: project.progress,
        value: project.value,
        deadline: toDateInput(project.deadline),
        description: project.description ?? '',
      })
    } else setForm(empty)
  }, [project, open])

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do projeto.')
      return
    }
    const matchedClient = clients.find((c) => c.id === form.clientId)
    const clientName = matchedClient?.name ?? form.client.trim() ?? '—'

    if (isEdit && project) {
      update(project.id, {
        name: form.name.trim(),
        client: clientName,
        clientId: matchedClient?.id ?? null,
        status: form.status,
        progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
        value: Number(form.value) || 0,
        deadline: new Date(form.deadline).toISOString(),
        description: form.description || null,
      })
      toast.success('Projeto atualizado.')
    } else {
      add({
        name: form.name.trim(),
        client: clientName,
        clientId: matchedClient?.id ?? null,
        status: form.status,
        progress: Number(form.progress) || 0,
        value: Number(form.value) || 0,
        deadline: new Date(form.deadline).toISOString(),
        description: form.description || null,
      })
      toast.success('Projeto criado!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar projeto' : 'Novo projeto'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
            {isEdit ? 'Salvar' : 'Criar projeto'}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome do projeto *" className="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Gestão Instagram · Março" />
        <Select
          label="Cliente"
          value={form.clientId}
          onChange={(e) => {
            const id = e.target.value
            const c = clients.find((cli) => cli.id === id)
            setForm({ ...form, clientId: id, client: c?.name ?? '' })
          }}
          options={[{ value: '', label: '— Selecionar —' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatusKey })} options={STATUS_OPTIONS} />
        <Input label="Valor (R$)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        <Input label="Progresso (%)" type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
        <Input label="Prazo" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Escopo / observações" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Resumo do escopo, deliverables, datas-chave..." />
        </div>
      </div>
    </Modal>
  )
}
