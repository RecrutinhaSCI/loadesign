import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import { useLeadsStore } from '@/store/leads.store'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRelative, buildWhatsappLink } from '@/lib/utils'

export function RecentLeads() {
  const navigate = useNavigate()
  const { items } = useLeadsStore()
  const recent = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-white/70">Leads recentes</h3>
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ArrowRight size={13} />}
          onClick={() => navigate('/leads')}
        >
          Ver todos
        </Button>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          title="Sem leads recentes"
          description="Os contatos do site aparecem aqui."
          action={{ label: 'Cadastrar lead', onClick: () => navigate('/leads') }}
        />
      ) : (
        <div className="divide-y divide-dark-border/50">
          {recent.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-dark-hover/40 transition-colors group"
            >
              <Avatar name={lead.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{lead.name}</p>
                <p className="text-xs text-white/30 truncate">{lead.service || lead.phone || '—'}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <LeadStatusBadge status={lead.status} />
                <span className="text-2xs text-white/25 hidden sm:block">{formatRelative(lead.createdAt)}</span>
                {lead.phone && (
                  <a
                    href={buildWhatsappLink(lead.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Button variant="ghost" size="icon">
                      <Phone size={13} />
                    </Button>
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
