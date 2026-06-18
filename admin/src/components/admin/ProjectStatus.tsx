import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useProjectsStore } from '@/store/projects.store'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ProjectStatusKey } from '@/types'

const statusConfig: Record<ProjectStatusKey, { label: string; className: string }> = {
  DRAFT:       { label: 'Rascunho',     className: 'bg-white/6 text-white/40 border-white/10' },
  IN_PROGRESS: { label: 'Em andamento', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  REVIEW:      { label: 'Em revisão',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  DONE:        { label: 'Entregue',     className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CANCELLED:   { label: 'Cancelado',    className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export function ProjectStatus() {
  const navigate = useNavigate()
  const { items: projects } = useProjectsStore()
  const recent = projects
    .filter((p) => p.status !== 'CANCELLED')
    .slice(0, 4)

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-white/70">Projetos ativos</h3>
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ArrowRight size={13} />}
          onClick={() => navigate('/projects')}
        >
          Ver todos
        </Button>
      </div>

      {recent.length === 0 ? (
        <EmptyState title="Nenhum projeto ativo" description="Comece criando um projeto." />
      ) : (
        <div className="divide-y divide-dark-border/50">
          {recent.map((project, i) => {
            const { label, className } = statusConfig[project.status]
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-dark-hover/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{project.name}</p>
                  <p className="text-xs text-white/30 truncate">{project.client}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white/75">{formatCurrency(project.value)}</p>
                  <p className="text-2xs text-white/25">{formatDate(project.deadline)}</p>
                </div>
                <span className={cn('badge shrink-0 hidden sm:inline-flex', className)}>
                  {label}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
