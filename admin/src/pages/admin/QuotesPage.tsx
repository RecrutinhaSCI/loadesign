import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, FileText, Pencil, Trash2, Phone } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuoteModal } from '@/components/admin/QuoteModal'
import { useQuotesStore } from '@/store/quotes.store'
import { useToastStore } from '@/store/toast.store'
import { formatCurrency, formatDate, buildWhatsappLink, cn } from '@/lib/utils'
import type { Quote, QuoteStatus } from '@/types'

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft:    { label: 'Rascunho', className: 'bg-white/6 text-white/40 border-white/10' },
  sent:     { label: 'Enviado',  className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  accepted: { label: 'Aceito',   className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Recusado', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  expired:  { label: 'Expirado', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

export function QuotesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)

  const { items: quotes, remove } = useQuotesStore()
  const toast = useToastStore()

  const handleNew = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (q: Quote) => { setEditing(q); setModalOpen(true) }
  const handleDelete = (q: Quote) => {
    if (!confirm(`Excluir o orçamento de "${q.clientName}"?`)) return
    remove(q.id)
    toast.success('Orçamento excluído.')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orçamentos"
        description="Propostas enviadas e em andamento"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
            Novo orçamento
          </Button>
        }
      />

      {quotes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="Nenhum orçamento ainda"
            description="Crie seu primeiro orçamento para um cliente ou lead."
            action={{ label: 'Criar orçamento', onClick: handleNew }}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {quotes.map((quote, i) => {
            const { label, className } = statusConfig[quote.status]
            return (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 group hover:shadow-card-hover transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white/85 truncate">{quote.clientName}</h3>
                    <p className="text-xs text-white/35 truncate">{quote.clientEmail || quote.clientPhone || '—'}</p>
                  </div>
                  <span className={cn('badge shrink-0', className)}>{label}</span>
                </div>

                <ul className="space-y-1 mb-4 text-xs text-white/45">
                  {quote.items.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.quantity}× {item.description}</span>
                      <span className="text-white/55 shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </li>
                  ))}
                  {quote.items.length > 3 && (
                    <li className="text-white/25 text-2xs">+ {quote.items.length - 3} {quote.items.length - 3 === 1 ? 'item' : 'itens'}</li>
                  )}
                </ul>

                <div className="flex items-end justify-between pt-3 border-t border-dark-border">
                  <div>
                    <p className="text-2xs text-white/30 uppercase tracking-wider">Total</p>
                    <p className="text-lg font-bold text-loa-400">{formatCurrency(quote.total)}</p>
                    <p className="text-2xs text-white/25 mt-0.5">Válido até {formatDate(quote.validUntil)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {quote.clientPhone && (
                      <a
                        href={buildWhatsappLink(quote.clientPhone, `Olá ${quote.clientName.split(' ')[0]}, segue seu orçamento Loa Design 🤍`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar pelo WhatsApp"
                        className="text-white/40 hover:text-loa-400 p-1.5 rounded-lg hover:bg-dark-hover"
                      >
                        <Phone size={13} />
                      </a>
                    )}
                    <button onClick={() => handleEdit(quote)} title="Editar" className="text-white/40 hover:text-loa-400 p-1.5 rounded-lg hover:bg-dark-hover">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(quote)} title="Excluir" className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-hover">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <QuoteModal open={modalOpen} onClose={() => setModalOpen(false)} quote={editing} />
    </div>
  )
}
