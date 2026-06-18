import { api } from './api'

// ─────────────────────────────────────────────────────────────────────────────
// Fábrica genérica de serviços CRUD tipados.
// Cada entity service exporta { list, get, create, update, remove }.
// ─────────────────────────────────────────────────────────────────────────────

export interface CrudService<T, CreatePayload, UpdatePayload = Partial<CreatePayload>> {
  list:   () => Promise<T[]>
  get:    (id: string) => Promise<T>
  create: (payload: CreatePayload) => Promise<T>
  update: (id: string, payload: UpdatePayload) => Promise<T>
  remove: (id: string) => Promise<void>
}

export function createCrudService<T, CreatePayload, UpdatePayload = Partial<CreatePayload>>(
  resource: string
): CrudService<T, CreatePayload, UpdatePayload> {
  return {
    list:   ()              => api.get<T[]>(`/${resource}`),
    get:    (id)            => api.get<T>(`/${resource}/${id}`),
    create: (payload)       => api.post<T, CreatePayload>(`/${resource}`, payload),
    update: (id, payload)   => api.patch<T, UpdatePayload>(`/${resource}/${id}`, payload),
    remove: (id)            => api.delete<void>(`/${resource}/${id}`),
  }
}
