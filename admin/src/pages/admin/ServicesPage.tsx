import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ServiceModal } from '@/components/admin/ServiceModal'
import { useServicesStore } from '@/store/services.store'
import { useToastStore } from '@/store/toast.store'
import { formatCurrency, cn } from '@/lib/utils'
import type { Service } from '@/types'

export function ServicesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  const { items: services, update, remove } = useServicesStore()
  const toast = useToastStore()

  const handleNew = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (s: Service) => { setEditing(s); setModalOpen(true) }

  const handleToggle = (s: Service) => {
    update(s.id, { active: !s.active })
    toast.success(s.active ? 'Serviço desativado' : 'Serviço ativado')
  }

  const handleDelete = (s: Service) => {
    if (!confirm(`Excluir o serviço "${s.name}"?`)) return
    remove(s.id)
    toast.success('Serviço excluído.')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Serviços & Pacotes"
        description="Pacotes Loa Design — gerencie preço, itens e visibilidade"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
            Novo serviço
          </Button>
        }
      />

      {services.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum serviço cadastrado"
            description="Crie o primeiro pacote da Loa."
            action={{ label: 'Criar serviço', onClick: handleNew }}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'card p-5 group hover:shadow-card-hover transition-all duration-300 flex flex-col',
                service.featured && 'border-loa-600/30 bg-loa-600/5',
                !service.active && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white/85">{service.name}</h3>
                    {service.featured && (
                      <span className="badge bg-loa-600/15 text-loa-400 border-loa-600/20">Mais pedido</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{service.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-white">{formatCurrency(service.price)}</p>
                  <p className="text-2xs text-white/30">/mês</p>
                </div>
              </div>

              <ul className="space-y-1.5 mb-5 flex-1">
                {service.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/55">
                    <span className="w-1 h-1 rounded-full bg-loa-500/60 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                <button
                  onClick={() => handleToggle(service)}
                  className="flex items-center gap-2 text-xs hover:text-white/70 transition-colors"
                >
                  {service.active
                    ? <ToggleRight size={16} className="text-emerald-400" />
                    : <ToggleLeft size={16} className="text-white/20" />
                  }
                  <span className={service.active ? 'text-white/50' : 'text-white/30'}>
                    {service.active ? 'Ativo' : 'Inativo'}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" leftIcon={<Edit2 size={11} />} onClick={() => handleEdit(service)}>
                    Editar
                  </Button>
                  <button
                    onClick={() => handleDelete(service)}
                    title="Excluir"
                    className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-hover transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ServiceModal open={modalOpen} onClose={() => setModalOpen(false)} service={editing} />
    </div>
  )
}
