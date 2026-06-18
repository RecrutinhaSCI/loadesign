import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, Briefcase, Package,
  FileText, DollarSign, Settings, ChevronLeft,
  X, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { useLeadsStore } from '@/store/leads.store'
import type { NavItem } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Navigation — badge de leads novos é injetado dinamicamente em <Sidebar />
// ─────────────────────────────────────────────────────────────────────────────
const BASE_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads',      href: '/leads',     icon: Users },
  { label: 'Clientes',   href: '/clients',   icon: UserCheck },
  { label: 'Projetos',   href: '/projects',  icon: Briefcase },
  { label: 'Serviços',   href: '/services',  icon: Package },
  { label: 'Orçamentos', href: '/quotes',    icon: FileText },
  { label: 'Financeiro', href: '/finance',   icon: DollarSign },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Configurações', href: '/settings', icon: Settings },
]

// ─────────────────────────────────────────────────────────────────────────────
// NavItem component
// ─────────────────────────────────────────────────────────────────────────────
function SidebarNavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const location = useLocation()
  const isActive = location.pathname === item.href ||
    (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        'hover:bg-dark-hover',
        isActive
          ? 'bg-loa-600/15 text-loa-400 border border-loa-600/20'
          : 'text-white/50 hover:text-white/80 border border-transparent'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-loa-500 rounded-full"
          transition={{ duration: 0.2 }}
        />
      )}

      <item.icon
        size={17}
        className={cn(
          'shrink-0 transition-colors',
          isActive ? 'text-loa-500' : 'text-white/30 group-hover:text-white/60'
        )}
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {!collapsed && item.badge && Number(item.badge) > 0 && (
        <span className="ml-auto bg-loa-600 text-white text-2xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
          {item.badge}
        </span>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-dark-card border border-dark-border rounded-lg text-xs text-white/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-card-dark">
          {item.label}
          {item.badge ? ` (${item.badge})` : ''}
        </div>
      )}
    </NavLink>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarState, isMobileSidebarOpen, setMobileSidebarOpen, toggleSidebar, } = useUIStore()
  const newLeads = useLeadsStore((s) => s.items.filter((l) => l.status === 'new').length)
  const NAV_ITEMS: NavItem[] = BASE_NAV.map((item) =>
    item.href === '/leads' && newLeads > 0 ? { ...item, badge: newLeads } : item
  )

  const sidebarCollapsed =
    sidebarState === 'collapsed'
  const width = sidebarCollapsed ? 'w-16' : 'w-60'

  const sidebarMobileOpen =
    isMobileSidebarOpen

  const closeMobileSidebar = () =>
    setMobileSidebarOpen(false)

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col',
          'bg-dark-surface border-r border-dark-border',
          'transition-transform duration-300',
          // Mobile: slide in/out
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          width
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center h-14 border-b border-dark-border shrink-0 px-4',
          sidebarCollapsed ? 'justify-center' : 'justify-between'
        )}>
          <AnimatePresence initial={false} mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-loa-600 flex items-center justify-center shrink-0">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div className="leading-none">
                  <p className="text-sm font-semibold text-white tracking-tight">Loa Design</p>
                  <p className="text-2xs text-white/30 tracking-widest uppercase">Admin</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-7 h-7 rounded-lg bg-loa-600 flex items-center justify-center"
              >
                <Sparkles size={13} className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile close */}
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-none px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={sidebarCollapsed}
              onClick={closeMobileSidebar}
            />
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-2 pb-3 pt-2 border-t border-dark-border space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={sidebarCollapsed}
              onClick={closeMobileSidebar}
            />
          ))}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'hidden lg:flex absolute -right-3 top-20',
            'w-6 h-6 rounded-full',
            'bg-dark-card border border-dark-border',
            'items-center justify-center',
            'text-white/30 hover:text-white/70 hover:border-loa-600/40 transition-all duration-200',
            'shadow-card-dark'
          )}
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft size={12} />
          </motion.div>
        </button>
      </motion.aside>
    </>
  )
}
