import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, LogOut, User, ChevronDown, Settings as SettingsIcon } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { NotificationsDropdown } from '@/components/admin/NotificationsDropdown'
import { ProfileModal } from '@/components/admin/ProfileModal'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Route labels
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/leads':     'Leads · CRM',
  '/projects':  'Projetos',
  '/clients':   'Clientes',
  '/services':  'Serviços & Pacotes',
  '/quotes':    'Orçamentos',
  '/finance':   'Financeiro',
  '/settings':  'Configurações',
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile dropdown — Meu perfil (modal) / Configurações (navega) / Sair (logout)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileDropdown({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const displayName  = user?.name  ?? 'Loa'
  const displayEmail = user?.email ?? 'admin@loadesign.com'

  const handleProfile = () => { setOpen(false); onOpenProfile() }
  const handleSettings = () => { setOpen(false); navigate('/settings') }
  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl',
          'border border-transparent hover:border-dark-border hover:bg-dark-hover',
          'transition-all duration-200 group'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={displayName} size="sm" />
        <div className="hidden sm:block text-left leading-none">
          <p className="text-xs font-medium text-white/80 truncate max-w-[100px]">{displayName}</p>
          <p className="text-2xs text-white/30 truncate max-w-[100px]">{String(user?.role ?? 'ADMIN').toUpperCase()}</p>
        </div>
        <ChevronDown
          size={12}
          className={cn('text-white/30 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-56 bg-dark-card border border-dark-border rounded-xl shadow-modal z-50 overflow-hidden"
            role="menu"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-dark-border">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-white/30 truncate">{displayEmail}</p>
            </div>

            {/* Actions */}
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={handleProfile}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-dark-hover transition-colors text-left"
              >
                <User size={14} /> Meu perfil
              </button>
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-dark-hover transition-colors text-left"
              >
                <SettingsIcon size={14} /> Configurações
              </button>
              <div className="my-1 border-t border-dark-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-colors text-left"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────────────────────────
export function Topbar() {
  const { toggleMobileSidebar } = useUIStore()
  const location = useLocation()
  const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Admin'

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Atalho Ctrl/Cmd + K abre o command palette de qualquer lugar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K'
      if (isK && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="h-14 flex items-center gap-4 px-4 md:px-6 border-b border-dark-border bg-dark-surface/80 backdrop-blur-md sticky top-0 z-30">
        {/* Mobile menu */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden text-white/40 hover:text-white/70 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white/80 truncate">{pageLabel}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search — desktop */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-input border border-dark-border text-white/35 text-xs hover:border-dark-muted hover:text-white/60 transition-colors"
            aria-label="Buscar (Ctrl+K)"
          >
            <Search size={13} />
            <span>Buscar</span>
            <kbd className="ml-2 text-2xs bg-dark-muted rounded px-1 py-0.5">⌘K</kbd>
          </button>

          {/* Search — mobile (só ícone) */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white/70 hover:bg-dark-hover border border-transparent hover:border-dark-border transition-all"
            aria-label="Buscar"
          >
            <Search size={16} />
          </button>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* Profile */}
          <ProfileDropdown onOpenProfile={() => setProfileOpen(true)} />
        </div>
      </header>

      {/* Overlays */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
