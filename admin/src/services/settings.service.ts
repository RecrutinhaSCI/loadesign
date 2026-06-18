import { api } from './api'
import type { AgencySettings } from '@/types'

export const settingsService = {
  get:    ()                              => api.get<AgencySettings>('/settings'),
  update: (payload: Partial<AgencySettings>) => api.patch<AgencySettings>('/settings', payload),
}
