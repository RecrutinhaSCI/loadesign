import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { AppRoutes } from '@/routes/AppRoutes'

// ─────────────────────────────────────────────────────────────────────────────
// App — bootstrap: valida token persistido contra /api/auth/me na carga
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { tokens, fetchMe } = useAuthStore()

  useEffect(() => {
    if (tokens?.accessToken) void fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AppRoutes />
}
