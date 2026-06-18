import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authService } from '@/services/auth.service'
import { extractError } from '@/services/api'
import type { User, AuthTokens, LoginCredentials } from '@/types'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login:       (credentials: LoginCredentials) => Promise<void>
  logout:      () => void
  fetchMe:     () => Promise<void>
  updateUser:  (patch: Partial<User>) => void
  clearError:  () => void
}

const initial: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initial,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const { user, tokens } = await authService.login(credentials)
          set({ user, tokens, isAuthenticated: true, isLoading: false, error: null })
        } catch (err) {
          set({ isLoading: false, error: extractError(err), isAuthenticated: false })
          throw err
        }
      },

      logout: () => {
        set({ ...initial })
      },

      fetchMe: async () => {
        if (!get().tokens?.accessToken) return
        try {
          const user = await authService.me()
          set({ user, isAuthenticated: true })
        } catch {
          // token inválido/expirado → desloga
          set({ ...initial })
        }
      },

      updateUser: (patch) => {
        const cur = get().user
        if (!cur) return
        set({ user: { ...cur, ...patch } })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'loa-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        tokens: s.tokens,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
