import { createEntityStore } from './createEntityStore'
import { servicesService, type CreateServicePayload } from '@/services/services.service'
import type { Service } from '@/types'

export const useServicesStore = createEntityStore<Service, CreateServicePayload>({ service: servicesService })
