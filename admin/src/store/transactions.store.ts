import { createEntityStore } from './createEntityStore'
import { transactionsService, type CreateTransactionPayload } from '@/services/transactions.service'
import type { Transaction } from '@/types'

export const useTransactionsStore = createEntityStore<Transaction, CreateTransactionPayload>({ service: transactionsService })
