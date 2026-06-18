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
        <Route path="leads"     element={<LeadsPage />}     />
        <Route path="projects"  element={<ProjectsPage />}  />
        <Route path="clients"   element={<ClientsPage />}   />
        <Route path="services"  element={<ServicesPage />}  />
        <Route path="quotes"    element={<QuotesPage />}    />
        <Route path="finance"   element={<FinancePage />}   />
        <Route path="settings"  element={<SettingsPage />}  />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
