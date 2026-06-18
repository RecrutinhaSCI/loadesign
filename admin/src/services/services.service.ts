import { createCrudService } from './createCrudService'
import type { Service } from '@/types'

export type CreateServicePayload = Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
export const servicesService = createCrudService<Service, CreateServicePayload>('services')
