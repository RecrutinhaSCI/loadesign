import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bell, UserPlus, Briefcase, FileText, BellOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLeadsStore } from '@/store/leads.store'
import { useProjectsStore } from '@/store/projects.store'
import { useQuotesStore } from '@/store/quotes.store'
import { cn, formatRelative } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsDropdown — sino com notificações reais derivadas das stores
// Clica fora ou ESC fecha
// ─────────────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  icon: LucideIcon
  iconClass: string
  iconBg: string
  title: string
  description: string
  timeAgoFrom: string
  href: string
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const leads    = useLeadsStore((s) => s.items)
  const projects = useProjectsStore((s) => s.items)
  const quotes   = useQuotesStore((s) => s.items)

  // Click fora fecha
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const notifications = useMemo<Notification[]>(() => {
    const list: Notification[] = []

    // Leads novos (status new)
    const newLeads = leads
      .filter((l) => l.status === 'new')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    for (const l of newLeads) {
      list.push({
        id: `lead-${l.id}`,
        icon: UserPlus,
        iconClass: 'text-loa-400',
        iconBg: 'bg-loa-600/10 border-loa-600/20',
        title: `Novo lead: ${l.name}`,
        description: l.service ? `Interesse em ${l.service}` : 'Aguardando primeiro contato',
        timeAgoFrom: l.createdAt,
        href: '/leads',
      })
    }

    // Projetos em andamento (IN_PROGRESS / REVIEW)
    const activeProjects = projects
      .filter((p) => p.status === 'IN_PROGRESS' || p.status === 'REVIEW')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3)

    for (const p of activeProjects) {
      const days = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const deadlineMsg = days < 0
        ? `Prazo vencido há ${Math.abs(days)} dia(s)`
        : days === 0 ? 'Vence hoje'
        : `Vence em ${days} dia(s)`
      list.push({
        id: `prj-${p.id}`,
        icon: Briefcase,
        iconClass: days < 3 ? 'text-amber-400' : 'text-blue-400',
        iconBg: days < 3
          ? 'bg-amber-500/10 border-amber-500/20'
          : 'bg-blue-500/10 border-blue-500/20',
        title: p.name,
        description: `${p.client} · ${deadlineMsg}`,
        timeAgoFrom: p.updatedAt,
        href: '/projects',
      })
    }

    // Orçamentos pendentes (status sent ou draft)
    const pendingQuotes = quotes
      .filter((q) => q.status === 'sent' || q.status === 'draft')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)

    for (const q of pendingQuotes) {
      list.push({
        id: `quote-${q.id}`,
        icon: FileText,
        iconClass: q.status === 'sent' ? 'text-emerald-400' : 'text-white/50',
        iconBg: q.status === 'sent'
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-white/5 border-white/10',
        title: q.status === 'sent' ? `Orçamento enviado` : `Orçamento em rascunho`,
        description: `${q.clientName} · R$ ${q.total.toLocaleString('pt-BR')}`,
        timeAgoFrom: q.createdAt,
        href: '/quotes',
      })
    }

    return list
  }, [leads, projects, quotes])

  const hasNotifications = notifications.length > 0

  const handlePick = (n: Notification) => {
    setOpen(false)
    navigate(n.href)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white/70 hover:bg-dark-hover border border-transparent hover:border-dark-border transition-all"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {hasNotifications && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-loa-500 rounded-full shadow-[0_0_4px_rgba(176,139,125,0.6)]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-dark-card border border-dark-border rounded-xl shadow-modal z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <p className="text-sm font-semibold text-white">Notificações</p>
              {hasNotifications && (
                <span className="text-2xs text-white/35">{notifications.length} ativa(s)</span>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
              {!hasNotifications ? (
                <div className="px-4 py-8 text-center">
                  <BellOff size={20} className="text-white/15 mx-auto mb-2" />
                  <p className="text-sm text-white/45">Tudo em dia 🤍</p>
                  <p className="text-2xs text-white/25 mt-1">
                    Sem leads novos, projetos urgentes ou orçamentos pendentes.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-dark-border/50">
                  {notifications.map((n) => {
                    const Icon = n.icon
                    return (
                      <button
                        key={n.id}
                        onClick={() => handlePick(n)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-dark-hover transition-colors"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                          n.iconBg
                        )}>
                          <Icon size={13} className={n.iconClass} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/85 truncate">{n.title}</p>
                          <p className="text-xs text-white/40 truncate">{n.description}</p>
                          <p className="text-2xs text-white/25 mt-0.5">{formatRelative(n.timeAgoFrom)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
