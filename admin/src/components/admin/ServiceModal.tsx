import { useEffect, useState } from 'react'
import { Save, X, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToastStore } from '@/store/toast.store'
import { useServicesStore } from '@/store/services.store'
import { slugify } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceModalProps {
  open: boolean
  onClose: () => void
  service?: Service | null
}

const empty = {
  name: '',
  description: '',
  price: 450,
  featured: false,
  active: true,
  items: [''],
}

export function ServiceModal({ open, onClose, service }: ServiceModalProps) {
  const toast = useToastStore()
  const { add, update } = useServicesStore()
  const isEdit = !!service
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        description: service.description,
        price: service.price,
        featured: service.featured,
        active: service.active,
        items: service.items.length ? service.items : [''],
      })
    } else setForm(empty)
  }, [service, open])

  const updateItem = (idx: number, value: string) => {
    const items = [...form.items]
    items[idx] = value
    setForm({ ...form, items })
  }

  const addItem = () => setForm({ ...form, items: [...form.items, ''] })
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do serviço.')
      return
    }
    const cleanItems = form.items.map((i) => i.trim()).filter(Boolean)
    if (isEdit && service) {
      update(service.id, {
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        featured: form.featured,
        active: form.active,
        items: cleanItems,
      })
      toast.success('Serviço atualizado.')
    } else {
      add({
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        featured: form.featured,
        active: form.active,
        items: cleanItems,
      })
      toast.success('Serviço criado!')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar serviço' : 'Novo serviço'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={13} />} onClick={handleSubmit}>
            {isEdit ? 'Salvar' : 'Criar serviço'}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome do pacote *" className="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pacote Avançado" />
        <div className="sm:col-span-2">
          <Textarea label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Resumo curto e comercial." />
        </div>
        <Input label="Preço mensal (R$)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        <div className="flex flex-col gap-2 justify-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-loa-600" />
            <span className="text-sm text-white/70">Destacar como popular</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-loa-600" />
            <span className="text-sm text-white/70">Serviço ativo</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-white/50 tracking-wide uppercase">Itens incluídos</label>
            <Button variant="ghost" size="sm" leftIcon={<Plus size={12} />} onClick={addItem}>Adicionar item</Button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={`Item ${i + 1}`} className="flex-1" />
                {form.items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-white/30 hover:text-red-400 transition-colors p-1">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
