import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout }     from '@/layouts/AdminLayout'
import { ProtectedRoute }  from './ProtectedRoute'
import { LoginPage }       from '@/pages/LoginPage'
import { DashboardPage }   from '@/pages/admin/DashboardPage'
import { LeadsPage }       from '@/pages/admin/LeadsPage'
import { ProjectsPage }    from '@/pages/admin/ProjectsPage'
import { ClientsPage }     from '@/pages/admin/ClientsPage'
import { ServicesPage }    from '@/pages/admin/ServicesPage'
import { QuotesPage }      from '@/pages/admin/QuotesPage'
import { FinancePage }     from '@/pages/admin/FinancePage'
import { SettingsPage }    from '@/pages/admin/SettingsPage'
import { NotFoundPage }    from '@/pages/NotFoundPage'
import { ContactsPage }    from '@/pages/admin/ContactsPage'
import { ProposalsPage }   from '@/pages/admin/ProposalsPage'
import { CommercialProjectsPage } from '@/pages/admin/CommercialProjectsPage'
import { ReceivablesPage } from '@/pages/admin/ReceivablesPage'
import { AgendaPage }      from '@/pages/admin/AgendaPage'

// ─────────────────────────────────────────────────────────────────────────────
// App Router
// ─────────────────────────────────────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected admin shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* Fluxo comercial integrado */}
        <Route path="contacts"  element={<ContactsPage />}  />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="projects"  element={<CommercialProjectsPage />} />
        <Route path="finance"   element={<ReceivablesPage />} />
        <Route path="finance/transactions" element={<FinancePage />} />
        <Route path="agenda"    element={<AgendaPage />}    />
        <Route path="services"  element={<ServicesPage />}  />
        {/* Módulos legados (preservados) */}
        <Route path="leads"     element={<LeadsPage />}     />
        <Route path="clients"   element={<ClientsPage />}   />
        <Route path="legacy/projects" element={<ProjectsPage />} />
        <Route path="legacy/quotes"   element={<QuotesPage />}   />
        <Route path="quotes"    element={<Navigate to="/proposals" replace />} />
        <Route path="settings"  element={<SettingsPage />}  />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
