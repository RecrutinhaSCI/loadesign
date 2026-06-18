import { createCrudService } from './createCrudService'
import type { Quote } from '@/types'

export type CreateQuotePayload = Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>
export const quotesService = createCrudService<Quote, CreateQuotePayload>('quotes')
