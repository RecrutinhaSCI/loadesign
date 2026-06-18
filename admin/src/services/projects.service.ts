import { createCrudService } from './createCrudService'
import type { Project } from '@/types'

export type CreateProjectPayload = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export const projectsService = createCrudService<Project, CreateProjectPayload>('projects')
