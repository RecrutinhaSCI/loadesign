import { api } from './api'
import type { User, AuthTokens, LoginCredentials } from '@/types'

interface LoginResponse {
  user: User
  tokens: AuthTokens
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const data = await api.post<{ user: Partial<User>; tokens: { accessToken: string } }>(
      '/auth/login',
      credentials
    )
    // backend retorna user enxuto e só accessToken; aqui normalizamos
    const user: User = {
      id: data.user.id!,
      name: data.user.name!,
      email: data.user.email!,
      avatar: data.user.avatar ?? null,
      role: (data.user.role as User['role']) ?? 'admin',
      status: 'active',
      createdAt: (data.user as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      updatedAt: (data.user as { updatedAt?: string }).updatedAt ?? new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: ['*'],
    }
    const tokens: AuthTokens = {
      accessToken: data.tokens.accessToken,
      refreshToken: '',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }
    return { user, tokens }
  },

  changePassword: async (payload: {
    currentPassword: string
    newPassword: string
  }): Promise<void> => {
    // Bearer token é injetado automaticamente pelo interceptor em services/api.ts
    await api.post<null, { currentPassword: string; newPassword: string }>(
      '/auth/change-password',
      payload
    )
  },

  me: async (): Promise<User> => {
    const u = await api.get<Partial<User>>('/auth/me')
    return {
      id: u.id!,
      name: u.name!,
      email: u.email!,
      avatar: u.avatar ?? null,
      role: (u.role as User['role']) ?? 'admin',
      status: 'active',
      createdAt: (u as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      updatedAt: (u as { updatedAt?: string }).updatedAt ?? new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: ['*'],
    }
  },
}
