import { createEntityStore } from './createEntityStore'
import { quotesService, type CreateQuotePayload } from '@/services/quotes.service'
import type { Quote } from '@/types'

export const useQuotesStore = createEntityStore<Quote, CreateQuotePayload>({ service: quotesService })
