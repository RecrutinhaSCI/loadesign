import { createCrudService } from './createCrudService'
import type { Transaction } from '@/types'

export type CreateTransactionPayload = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
export const transactionsService = createCrudService<Transaction, CreateTransactionPayload>('transactions')
