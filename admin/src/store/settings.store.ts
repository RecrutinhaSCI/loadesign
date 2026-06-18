import { create } from 'zustand'
import { settingsService } from '@/services/settings.service'
import { extractError } from '@/services/api'
import type { AgencySettings } from '@/types'

const DEFAULTS: AgencySettings = {
  name: 'Loa Design',
  email: 'loadesigndigital@gmail.com',
  whatsapp: '5554999912694',
  instagram: '@loadesigndigital',
  website: 'https://loadesign.com.br',
  ownerName: 'Loa',
  ownerEmail: 'loadesigndigital@gmail.com',
  notifications: {
    newLead: true,
    statusChange: true,
    paymentReceived: true,
    projectDelivered: true,
  },
}

interface SettingsState {
  settings: AgencySettings
  loading: boolean
  loaded: boolean
  error: string | null
}

interface SettingsActions {
  fetch:               () => Promise<void>
  updateSettings:      (patch: Partial<AgencySettings>) => Promise<void>
  updateNotifications: (patch: Partial<AgencySettings['notifications']>) => Promise<void>
}

export const useSettingsStore = create<SettingsState & SettingsActions>()((set, get) => ({
  settings: DEFAULTS,
  loading: false,
  loaded: false,
  error: null,

  fetch: async () => {
    if (get().loading || get().loaded) return
    set({ loading: true, error: null })
    try {
      const s = await settingsService.get()
      set({ settings: { ...DEFAULTS, ...s }, loading: false, loaded: true })
    } catch (err) {
      set({ loading: false, error: extractError(err) })
    }
  },

  updateSettings: async (patch) => {
    const merged = { ...get().settings, ...patch }
    const saved = await settingsService.update(merged)
    set({ settings: { ...DEFAULTS, ...saved } })
  },

  updateNotifications: async (patch) => {
    const merged = {
      ...get().settings,
      notifications: { ...get().settings.notifications, ...patch },
    }
    const saved = await settingsService.update(merged)
    set({ settings: { ...DEFAULTS, ...saved } })
  },
}))
