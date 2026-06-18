import { createCrudService } from './createCrudService'
import type { Lead } from '@/types'

export type CreateLeadPayload = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>
export const leadsService = createCrudService<Lead, CreateLeadPayload>('leads')
