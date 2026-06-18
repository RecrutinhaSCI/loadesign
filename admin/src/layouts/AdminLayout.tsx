import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from '@/components/layouts/Sidebar'
import { Topbar } from '@/components/layouts/Topbar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { useUIStore } from '@/store/ui.store'
import { useLeadsStore } from '@/store/leads.store'
import { useClientsStore } from '@/store/clients.store'
import { useProjectsStore } from '@/store/projects.store'
import { useServicesStore } from '@/store/services.store'
import { useQuotesStore } from '@/store/quotes.store'
import { useTransactionsStore } from '@/store/transactions.store'
import { useSettingsStore } from '@/store/settings.store'

// ─────────────────────────────────────────────────────────────────────────────
// Admin Layout — sidebar + topbar + main area
// Faz bootstrap único: ao montar, dispara fetch() em todas as stores → tudo quente
// ─────────────────────────────────────────────────────────────────────────────
export function AdminLayout() {
  const { sidebarState } = useUIStore()
  const location = useLocation()

  const fetchLeads = useLeadsStore((s) => s.fetch)
  const fetchClients = useClientsStore((s) => s.fetch)
  const fetchProjects = useProjectsStore((s) => s.fetch)
  const fetchServices = useServicesStore((s) => s.fetch)
  const fetchQuotes = useQuotesStore((s) => s.fetch)
  const fetchTransactions = useTransactionsStore((s) => s.fetch)
  const fetchSettings = useSettingsStore((s) => s.fetch)

  useEffect(() => {
    void fetchLeads()
    void fetchClients()
    void fetchProjects()
    void fetchServices()
    void fetchQuotes()
    void fetchTransactions()
    void fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const desktopOffset =
    sidebarState === 'collapsed' ? 72
    : sidebarState === 'hidden' ? 0
    : 260

  return (
    <div className="min-h-screen bg-dark-bg text-white overflow-x-hidden">
      <Sidebar />

      <div
        className="min-h-screen flex flex-col transition-[padding-left] duration-300 ease-out lg:pl-[var(--sidebar-w)]"
        style={{ '--sidebar-w': `${desktopOffset}px` } as React.CSSProperties}
      >
        <Topbar />

        <main className="flex-1 w-full overflow-x-hidden px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto w-full max-w-[1600px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}