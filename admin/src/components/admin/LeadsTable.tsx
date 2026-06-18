import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  MoreHorizontal, Phone, Eye, Trash2, Pencil,
  ChevronLeft, ChevronRight, MessageSquareText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { LeadModal } from './LeadModal'
import { formatDate, formatRelative, buildWhatsappLink, cn } from '@/lib/utils'
import { useLeadsStore } from '@/store/leads.store'
import { useToastStore } from '@/store/toast.store'
import type { Lead, LeadStatus } from '@/types'

interface LeadsTableProps {
  onEdit: (lead: Lead) => void
}

const STATUS_TABS: Array<{ value: LeadStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'Todos'         },
  { value: 'new',       label: 'Novos'         },
  { value: 'contacted', label: 'Contatados'    },
  { value: 'qualified', label: 'Qualificados'  },
  { value: 'proposal',  label: 'Orçamentos'    },
  { value: 'won',       label: 'Fechados'      },
  { value: 'lost',      label: 'Perdidos'      },
]

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new',       label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal',  label: 'Orçamento enviado' },
  { value: 'won',       label: 'Fechado' },
  { value: 'lost',      label: 'Perdido' },
]

const PAGE_SIZE = 10

function SortIcon({ column, current, order }: {
  column: keyof Lead; current: keyof Lead; order: 'asc' | 'desc'
}) {
  if (column !== current) return <ChevronsUpDown size={13} className="text-white/20" />
  return order === 'asc'
    ? <ChevronUp size={13} className="text-loa-400" />
    : <ChevronDown size={13} className="text-loa-400" />
}

function RowActions({
  lead, onView, onEdit, onDelete,
}: { lead: Lead; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const waLink = lead.phone ? buildWhatsappLink(lead.phone) : '#'

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal size={14} />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 w-48 bg-dark-card border border-dark-border rounded-xl shadow-modal z-20 overflow-hidden p-1"
            >
              <button
                onClick={() => { setOpen(false); onView() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-dark-hover transition-colors text-left"
              >
                <Eye size={13} /> Ver detalhes
              </button>
              <button
                onClick={() => { setOpen(false); onEdit() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-dark-hover transition-colors text-left"
              >
                <Pencil size={13} /> Editar
              </button>
              {lead.phone && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-dark-hover transition-colors"
                >
                  <Phone size={13} /> Abrir WhatsApp
                </a>
              )}
              <div className="my-1 border-t border-dark-border" />
              <button
                onClick={() => { setOpen(false); onDelete() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 size={13} /> Excluir
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center hover:opacity-80 transition-opacity">
        <LeadStatusBadge status={lead.status} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1 w-44 bg-dark-card border border-dark-border rounded-xl shadow-modal z-20 overflow-hidden p-1"
            >
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setOpen(false); onUpdate(opt.value) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left',
                    lead.status === opt.value
                      ? 'text-loa-400 bg-loa-600/10'
                      : 'text-white/50 hover:text-white hover:bg-dark-hover'
                  )}
                >
                  {lead.status === opt.value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-loa-500 shrink-0" />
                  )}
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LeadsTable({ onEdit }: LeadsTableProps) {
  const { items: leads, update, remove } = useLeadsStore()
  const toast = useToastStore()

  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<keyof Lead>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (!term) return true
      return (
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        (l.company ?? '').toLowerCase().includes(term) ||
        l.service.toLowerCase().includes(term)
      )
    })
  }, [leads, statusFilter, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortBy]
      const bv = b[sortBy]
      if (av === bv) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageData = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSort = (col: keyof Lead) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const openModal = (lead: Lead) => { setSelectedLead(lead); setModalOpen(true) }
  const handleStatusUpdate = async (id: string, status: LeadStatus) => {
    update(id, { status })
    toast.success('Status atualizado.')
    if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, status })
  }
  const handleDelete = async (id: string) => {
    remove(id)
    toast.success('Lead excluído.')
  }

  return (
    <>
      <div className="card mb-4">
        <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto scrollbar-none border-b border-dark-border pb-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={cn(
                'px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200',
                statusFilter === tab.value
                  ? 'text-loa-400 border-loa-500'
                  : 'text-white/35 border-transparent hover:text-white/60 hover:border-dark-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Buscar por nome, e-mail, serviço..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                {[
                  { label: 'Lead',       key: 'name'      as keyof Lead },
                  { label: 'Serviço',    key: 'service'   as keyof Lead },
                  { label: 'Status',     key: 'status'    as keyof Lead },
                  { label: 'Valor',      key: 'value'     as keyof Lead },
                  { label: 'Criado',     key: 'createdAt' as keyof Lead },
                ].map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors"
                    >
                      {col.label}
                      <SortIcon column={col.key} current={sortBy} order={sortDir} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Nenhum lead encontrado"
                      description="Tente ajustar os filtros ou cadastre um novo lead."
                    />
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {pageData.map((lead, i) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group border-b border-dark-border/50 hover:bg-dark-hover/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={lead.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openModal(lead)}
                                className="text-sm font-medium text-white/80 hover:text-white transition-colors truncate block max-w-[180px] text-left"
                              >
                                {lead.name}
                              </button>
                              {lead.notes && (
                                <MessageSquareText
                                  size={11}
                                  className="text-loa-400/70 shrink-0"
                                  aria-label="Tem mensagem"
                                />
                              )}
                            </div>
                            <p
                              className="text-xs text-white/30 truncate max-w-[220px]"
                              title={lead.notes ?? undefined}
                            >
                              {lead.notes
                                ? `“${lead.notes}”`
                                : (lead.company ?? lead.email)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/55 truncate block max-w-[160px]">{lead.service || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusDropdown lead={lead} onUpdate={(s) => handleStatusUpdate(lead.id, s)} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/55 font-medium">
                          {lead.value > 0 ? `R$ ${lead.value.toLocaleString('pt-BR')}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/35">{formatDate(lead.createdAt)}</span>
                        <p className="text-2xs text-white/20 mt-0.5">{formatRelative(lead.updatedAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <RowActions
                          lead={lead}
                          onView={() => openModal(lead)}
                          onEdit={() => onEdit(lead)}
                          onDelete={() => handleDelete(lead.id)}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
            <p className="text-xs text-white/30">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, sorted.length)} de {sorted.length} leads
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft size={14} />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      safePage === p
                        ? 'bg-loa-600/20 text-loa-400 border border-loa-600/30'
                        : 'text-white/30 hover:text-white/60 hover:bg-dark-hover'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <Button variant="ghost" size="icon" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <LeadModal
        lead={selectedLead}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusUpdate}
        onDelete={handleDelete}
        isUpdating={false}
      />
    </>
  )
}
