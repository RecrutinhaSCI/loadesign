import { api } from './api'

// Mensagens recebidas pelo formulário do site público (/api/contact).
export type MessageStatus = 'NEW' | 'READ' | 'ARCHIVED'

export interface SiteMessage {
  id: string
  name: string
  email: string | null
  phone: string
  instagram: string | null
  service: string | null
  message: string
  status: MessageStatus
  leadId: string | null
  createdAt: string
  updatedAt: string
}

export interface MessagesPage {
  items: SiteMessage[]
  total: number
  page: number
  pageSize: number
  counts: Record<MessageStatus, number>
}

export interface MessagesQuery {
  status?: MessageStatus | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export const messagesApi = {
  list: (q: MessagesQuery = {}) => {
    const p = new URLSearchParams()
    if (q.status) p.set('status', q.status)
    if (q.search) p.set('search', q.search)
    if (q.page) p.set('page', String(q.page))
    if (q.pageSize) p.set('pageSize', String(q.pageSize))
    const qs = p.toString()
    return api.get<MessagesPage>(`/contact${qs ? `?${qs}` : ''}`)
  },
  setStatus: (id: string, status: MessageStatus) => api.patch<SiteMessage>(`/contact/${encodeURIComponent(id)}`, { status }),
  remove: (id: string) => api.delete<null>(`/contact/${encodeURIComponent(id)}`),
}
