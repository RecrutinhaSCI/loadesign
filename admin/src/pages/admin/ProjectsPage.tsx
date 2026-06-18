import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProjectModal } from '@/components/admin/ProjectModal'
import { useProjectsStore } from '@/store/projects.store'
import { useToastStore } from '@/store/toast.store'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Project, ProjectStatusKey } from '@/types'

const statusConfig: Record<ProjectStatusKey, { label: string; className: string }> = {
  DRAFT:       { label: 'Rascunho',     className: 'bg-white/6 text-white/40 border-white/10' },
  IN_PROGRESS: { label: 'Em andamento', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  REVIEW:      { label: 'Em revisão',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  DONE:        { label: 'Entregue',     className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CANCELLED:   { label: 'Cancelado',    className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatusKey | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const { items: projects, remove } = useProjectsStore()
  const toast = useToastStore()

  const filtered = projects.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses: Array<{ value: ProjectStatusKey | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Todos' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'IN_PROGRESS', label: 'Em andamento' },
    { value: 'REVIEW', label: 'Em revisão' },
    { value: 'DONE', label: 'Entregue' },
  ]

  const handleNew = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (p: Project) => { setEditing(p); setModalOpen(true) }
  const handleDelete = (p: Project) => {
    if (!confirm(`Excluir o projeto "${p.name}"?`)) return
    remove(p.id)
    toast.success('Projeto excluído.')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projetos"
        description="Gerencie os projetos em andamento e entregues"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
            Novo projeto
          </Button>
        }
      />

      <div className="card">
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-dark-border overflow-x-auto scrollbar-none">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200',
                statusFilter === s.value
                  ? 'text-loa-400 border-loa-500'
                  : 'text-white/35 border-transparent hover:text-white/60 hover:border-dark-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-3">
          <div className="max-w-xs">
            <Input
              placeholder="Buscar projetos..."
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
                {['Projeto', 'Cliente', 'Status', 'Progresso', 'Valor', 'Prazo', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-white/25">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Nenhum projeto encontrado"
                      description="Crie o primeiro projeto da agência."
                      action={{ label: 'Criar projeto', onClick: handleNew }}
                    />
                  </td>
                </tr>
              ) : filtered.map((project, i) => {
                const { label, className } = statusConfig[project.status]
                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-dark-border/50 hover:bg-dark-hover/40 transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-white/80">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-white/30 truncate max-w-[240px]">{project.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={project.client} size="sm" />
                        <span className="text-sm text-white/50 truncate max-w-[140px]">{project.client}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('badge', className)}>{label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-1.5 bg-dark-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-loa-500 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/45 w-8 text-right">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-white/70">{formatCurrency(project.value)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-white/35">{formatDate(project.deadline)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(project)} title="Editar" className="text-white/40 hover:text-loa-400 p-1.5 rounded-lg hover:bg-dark-hover">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(project)} title="Excluir" className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-hover">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} project={editing} />
    </div>
  )
}
