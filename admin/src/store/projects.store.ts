import { createEntityStore } from './createEntityStore'
import { projectsService, type CreateProjectPayload } from '@/services/projects.service'
import type { Project } from '@/types'

export const useProjectsStore = createEntityStore<Project, CreateProjectPayload>({ service: projectsService })
