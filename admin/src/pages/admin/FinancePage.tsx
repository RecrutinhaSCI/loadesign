import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TransactionModal } from '@/components/admin/TransactionModal'
import { useTransactionsStore } from '@/store/transactions.store'
import { useToastStore } from '@/store/toast.store'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction } from '@/types'

export function FinancePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const { items: transactions, remove } = useTransactionsStore()
  const toast = useToastStore()

  const totalIncome  = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.value, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.value, 0)
  const balance      = totalIncome - totalExpense

  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleNew = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (t: Transaction) => { setEditing(t); setModalOpen(true) }
  const handleDelete = (t: Transaction) => {
    if (!confirm('Excluir esta transação?')) return
    remove(t.id)
    toast.success('Transação excluída.')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e saúde financeira da agência"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
            Nova transação
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Receita total"   value={formatCurrency(totalIncome)}  icon={TrendingUp}   variant="primary" delay={0}    trend={{ value: 16.7, label: 'vs mês ant.' }} />
        <StatCard title="Despesas totais"  value={formatCurrency(totalExpense)} icon={TrendingDown} delay={0.05} />
        <StatCard title="Saldo atual"      value={formatCurrency(balance)}      icon={DollarSign}   delay={0.10} />
      </div>

      <RevenueChart />

      <div className="card">
        <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">Transações</h3>
          <span className="text-xs text-white/30">{sorted.length} {sorted.length === 1 ? 'lançamento' : 'lançamentos'}</span>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            title="Nenhuma transação registrada"
            description="Registre receitas e despesas para acompanhar o caixa."
            action={{ label: 'Nova transação', onClick: handleNew }}
          />
        ) : (
          <div className="divide-y divide-dark-border/50">
            {sorted.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-dark-hover/40 transition-colors group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                  tx.type === 'income'
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                )}>
                  {tx.type === 'income'
                    ? <ArrowUpRight size={14} className="text-emerald-400" />
                    : <TrendingDown size={14} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/75 truncate">{tx.description}</p>
                  <p className="text-xs text-white/30">{tx.category} · {formatDate(tx.date)} {tx.client !== '—' && `· ${tx.client}`}</p>
                </div>
                <p className={cn(
                  'text-sm font-semibold shrink-0',
                  tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.value)}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => handleEdit(tx)} title="Editar" className="text-white/40 hover:text-loa-400 p-1.5 rounded-lg hover:bg-dark-hover">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(tx)} title="Excluir" className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-hover">
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} transaction={editing} />
    </div>
  )
}
