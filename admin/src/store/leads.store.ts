import { createEntityStore } from './createEntityStore'
import { leadsService, type CreateLeadPayload } from '@/services/leads.service'
import type { Lead } from '@/types'

export const useLeadsStore = createEntityStore<Lead, CreateLeadPayload>({ service: leadsService })
