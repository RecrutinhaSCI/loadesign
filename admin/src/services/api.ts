import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth.store'

// ─────────────────────────────────────────────────────────────────────────────
// Axios client central com interceptor de JWT e tratamento de erro unificado.
// Resposta padrão da API: { success, message, data }
// Em caso de erro: { success: false, error: '...' }
// ─────────────────────────────────────────────────────────────────────────────

// Em dev, o proxy do Vite redireciona /api → http://localhost:3333
// Em prod, defina VITE_API_URL=https://sua-api.com
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens
  if (tokens?.accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      // sessão inválida → expulsa do admin
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ─── Helpers tipados ─────────────────────────────────────────────────────────

interface EnvelopeOk<T> { success: true; message?: string; data: T }
interface EnvelopeErr   { success: false; error: string; details?: unknown }
type Envelope<T> = EnvelopeOk<T> | EnvelopeErr

function unwrap<T>(envelope: Envelope<T>): T {
  if (!envelope.success) throw new Error(envelope.error)
  return envelope.data
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const env = err.response?.data as Envelope<unknown> | undefined
    if (env && !env.success && env.error) return env.error
    if (err.code === 'ECONNABORTED') return 'Tempo esgotado. Verifique sua conexão.'
    if (err.message === 'Network Error') return 'Não foi possível conectar ao servidor.'
    return err.message
  }
  return err instanceof Error ? err.message : 'Erro desconhecido'
}

export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.get<Envelope<T>>(url, config)
    return unwrap(res.data)
  },
  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.post<Envelope<T>>(url, data, config)
    return unwrap(res.data)
  },
  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.patch<Envelope<T>>(url, data, config)
    return unwrap(res.data)
  },
  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.put<Envelope<T>>(url, data, config)
    return unwrap(res.data)
  },
  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.delete<Envelope<T>>(url, config)
    return unwrap(res.data)
  },
}

export { extractError }
