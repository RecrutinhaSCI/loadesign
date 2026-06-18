import { create } from 'zustand'
import type { CrudService } from '@/services/createCrudService'
import { extractError } from '@/services/api'

// ─────────────────────────────────────────────────────────────────────────────
// createEntityStore — store Zustand que envolve um CrudService.
// Interface compatível com a versão antiga (items/add/update/remove)
// para que as páginas existentes funcionem sem mudança.
// Adiciona estado de loading/error e método refresh().
//
// Estratégia de UI:
//  - fetch() carrega items na primeira chamada (hidratação on-demand)
//  - add/update/remove fazem chamada à API e atualizam items local
//  - on 401 → o interceptor da api expulsa para /login automaticamente
// ─────────────────────────────────────────────────────────────────────────────

interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

interface EntityState<T extends BaseEntity> {
  items: T[]
  loading: boolean
  loaded: boolean
  error: string | null
}

interface EntityActions<T extends BaseEntity, CreatePayload> {
  fetch:   () => Promise<void>
  refresh: () => Promise<void>
  add:     (payload: CreatePayload) => Promise<T>
  update:  (id: string, patch: Partial<CreatePayload>) => Promise<T>
  remove:  (id: string) => Promise<void>
  reset:   () => void
}

export type EntityStore<T extends BaseEntity, CreatePayload> =
  EntityState<T> & EntityActions<T, CreatePayload>

interface CreateEntityStoreOpts<T extends BaseEntity, CreatePayload> {
  service: CrudService<T, CreatePayload>
}

export function createEntityStore<T extends BaseEntity, CreatePayload>({
  service,
}: CreateEntityStoreOpts<T, CreatePayload>) {
  return create<EntityStore<T, CreatePayload>>()((set, get) => ({
    items: [],
    loading: false,
    loaded: false,
    error: null,

    fetch: async () => {
      if (get().loading || get().loaded) return
      set({ loading: true, error: null })
      try {
        const items = await service.list()
        set({ items, loading: false, loaded: true })
      } catch (err) {
        set({ loading: false, error: extractError(err) })
      }
    },

    refresh: async () => {
      set({ loading: true, error: null })
      try {
        const items = await service.list()
        set({ items, loading: false, loaded: true })
      } catch (err) {
        set({ loading: false, error: extractError(err) })
      }
    },

    add: async (payload) => {
      const created = await service.create(payload)
      set((s) => ({ items: [created, ...s.items] }))
      return created
    },

    update: async (id, patch) => {
      const updated = await service.update(id, patch)
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }))
      return updated
    },

    remove: async (id) => {
      await service.remove(id)
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    },

    reset: () => set({ items: [], loaded: false, error: null }),
  }))
}
