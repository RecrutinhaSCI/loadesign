import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Phone, Trash2, Pencil, Instagram } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClientModal } from '@/components/admin/ClientModal'
import { useClientsStore } from '@/store/clients.store'
import { useToastStore } from '@/store/toast.store'
import { formatCurrency, formatDate, buildWhatsappLink } from '@/lib/utils'
import type { Client } from '@/types'

export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const { items: clients, remove } = useClientsStore()
  const toast = useToastStore()

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (client: Client) => {
    setEditing(client)
    setModalOpen(true)
  }

  const handleDelete = (client: Client) => {
    if (!confirm(`Excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`)) return
    remove(client.id)
    toast.success('Cliente excluído.')
  }

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Base de clientes ativos da Loa Design"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
            Novo cliente
          </Button>
        }
      />

      <div className="card">
        <div className="px-4 py-3 border-b border-dark-border">
          <div className="max-w-xs">
            <Input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                {['Cliente', 'Contato', 'Projetos', 'Receita total', 'Desde', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-white/25">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Nenhum cliente cadastrado"
                      description="Crie seu primeiro cliente para começar."
                      action={{ label: 'Cadastrar cliente', onClick: handleNew }}
                    />
                  </td>
                </tr>
              ) : filtered.map((client, i) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-dark-border/50 hover:bg-dark-hover/40 transition-colors group"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{client.name}</p>
                        <p className="text-xs text-white/30 truncate max-w-[180px]">{client.company ?? client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={buildWhatsappLink(client.phone, `Oi ${client.name.split(' ')[0]}! Aqui é a Loa 🤍`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
                        className="text-white/30 hover:text-loa-400 transition-colors"
                      >
                        <Phone size={14} />
                      </a>
                      {client.instagram && (
                        <a
                          href={`https://instagram.com/${client.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Instagram"
                          className="text-white/30 hover:text-loa-400 transition-colors"
                        >
                          <Instagram size={14} />
                        </a>
                      )}
                      <span className="text-xs text-white/40 ml-1">{client.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-white/60">{client.totalProjects}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-white/70">{formatCurrency(client.totalRevenue)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-white/35">{formatDate(client.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(client)} title="Editar" className="text-white/40 hover:text-loa-400 p-1.5 rounded-lg hover:bg-dark-hover">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(client)} title="Excluir" className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-hover">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal open={modalOpen} onClose={() => setModalOpen(false)} client={editing} />
    </div>
  )
}
