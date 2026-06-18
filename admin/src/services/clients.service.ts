import { createCrudService } from './createCrudService'
import type { Client } from '@/types'

export type CreateClientPayload = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
export const clientsService = createCrudService<Client, CreateClientPayload>('clients')
