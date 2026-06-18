import { createEntityStore } from './createEntityStore'
import { clientsService, type CreateClientPayload } from '@/services/clients.service'
import type { Client } from '@/types'

export const useClientsStore = createEntityStore<Client, CreateClientPayload>({ service: clientsService })
