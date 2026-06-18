import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, Users, UserCheck, Briefcase, Package, X, CornerDownLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLeadsStore } from '@/store/leads.store'
import { useClientsStore } from '@/store/clients.store'
import { useProjectsStore } from '@/store/projects.store'
import { useServicesStore } from '@/store/services.store'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// CommandPalette — busca global Ctrl+K em leads/clients/projects/services
// Resultado clicável navega para a página da entidade
// ─────────────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

type ResultKind = 'lead' | 'client' | 'project' | 'service'

interface SearchResult {
  id: string
  kind: ResultKind
  title: string
  subtitle: string
  href: string
  icon: LucideIcon
}

const KIND_LABEL: Record<ResultKind, string> = {
  lead: 'Leads',
  client: 'Clientes',
  project: 'Projetos',
  service: 'Serviços',
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const leads    = useLeadsStore((s) => s.items)
  const clients  = useClientsStore((s) => s.items)
  const projects = useProjectsStore((s) => s.items)
  const services = useServicesStore((s) => s.items)

  // Foca input ao abrir e zera query/seleção
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      // pequeno delay para a animação
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Lock scroll quando aberto
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    const acc: SearchResult[] = []

    const addMatching = <T,>(
      items: T[],
      build: (it: T) => SearchResult,
      matches: (it: T, q: string) => boolean,
      limit: number,
    ) => {
      const filtered = q
        ? items.filter((it) => matches(it, q))
        : items
      for (const it of filtered.slice(0, limit)) acc.push(build(it))
    }

    addMatching(
      leads,
      (l) => ({
        id: l.id,
        kind: 'lead',
        title: l.name,
        subtitle: `${l.service || '—'} · ${l.status}`,
        href: '/leads',
        icon: Users,
      }),
      (l, q) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company ?? '').toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q),
      5,
    )

    addMatching(
      clients,
      (c) => ({
        id: c.id,
        kind: 'client',
        title: c.name,
        subtitle: c.company ?? c.email,
        href: '/clients',
        icon: UserCheck,
      }),
      (c, q) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
      5,
    )

    addMatching(
      projects,
      (p) => ({
        id: p.id,
        kind: 'project',
        title: p.name,
        subtitle: `${p.client} · ${p.status}`,
        href: '/projects',
        icon: Briefcase,
      }),
      (p, q) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q),
      5,
    )

    addMatching(
      services,
      (s) => ({
        id: s.id,
        kind: 'service',
        title: s.name,
        subtitle: s.description,
        href: '/services',
        icon: Package,
      }),
      (s, q) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
      5,
    )

    return acc
  }, [query, leads, clients, projects, services])

  // Grupos para exibição
  const grouped = useMemo(() => {
    const groups: Record<ResultKind, SearchResult[]> = {
      lead: [], client: [], project: [], service: [],
    }
    for (const r of results) groups[r.kind].push(r)
    return groups
  }, [results])

  // Navegação por teclado
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        const target = results[activeIdx]
        if (target) {
          e.preventDefault()
          navigate(target.href)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, activeIdx, navigate, onClose])

  // Reset índice quando query muda
  useEffect(() => { setActiveIdx(0) }, [query])

  const handlePick = (r: SearchResult) => {
    navigate(r.href)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl bg-dark-card border border-dark-border rounded-2xl shadow-modal overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-dark-border">
              <Search size={15} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar leads, clientes, projetos, serviços..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
              />
              <kbd className="text-2xs bg-dark-muted text-white/40 rounded px-1.5 py-0.5">ESC</kbd>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/60 transition-colors"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>

            {/* Resultados */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Search size={20} className="text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">
                    {query ? 'Nada encontrado para essa busca.' : 'Digite algo para começar a buscar.'}
                  </p>
                  <p className="text-xs text-white/25 mt-1">
                    Procura em leads, clientes, projetos e serviços já carregados.
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {(Object.keys(grouped) as ResultKind[]).map((kind) => {
                    const items = grouped[kind]
                    if (items.length === 0) return null
                    return (
                      <div key={kind} className="mb-1">
                        <p className="px-4 py-1.5 text-2xs uppercase tracking-widest text-white/30 font-semibold">
                          {KIND_LABEL[kind]}
                        </p>
                        {items.map((r) => {
                          const globalIdx = results.indexOf(r)
                          const isActive = globalIdx === activeIdx
                          const Icon = r.icon
                          return (
                            <button
                              key={`${r.kind}-${r.id}`}
                              onMouseEnter={() => setActiveIdx(globalIdx)}
                              onClick={() => handlePick(r)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                                isActive ? 'bg-loa-600/10' : 'hover:bg-dark-hover'
                              )}
                            >
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border',
                                isActive
                                  ? 'bg-loa-600/15 border-loa-600/30 text-loa-400'
                                  : 'bg-dark-muted border-dark-border text-white/40'
                              )}>
                                <Icon size={13} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm font-medium truncate',
                                  isActive ? 'text-white' : 'text-white/80'
                                )}>
                                  {r.title}
                                </p>
                                <p className="text-xs text-white/35 truncate">{r.subtitle}</p>
                              </div>
                              {isActive && (
                                <CornerDownLeft size={12} className="text-white/35 shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer atalhos */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-dark-border text-2xs text-white/30">
              <span>{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-dark-muted px-1 py-0.5 rounded">↑↓</kbd> navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-dark-muted px-1 py-0.5 rounded">↵</kbd> abrir
                </span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
