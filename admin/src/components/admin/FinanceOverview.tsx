import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react'
import { useTransactionsStore } from '@/store/transactions.store'
import { formatCurrency } from '@/lib/utils'

const MONTHLY_GOAL = 5000

export function FinanceOverview() {
  const { items } = useTransactionsStore()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const incomes = items.filter((t) => t.type === 'income')
  const expenses = items.filter((t) => t.type === 'expense')

  const totalRevenue = incomes.reduce((s, t) => s + t.value, 0)
  const monthRevenue = incomes
    .filter((t) => new Date(t.date) >= startOfMonth)
    .reduce((s, t) => s + t.value, 0)
  const totalExpense = expenses.reduce((s, t) => s + t.value, 0)
  const avgTicket = incomes.length > 0 ? totalRevenue / incomes.length : 0

  const summary = [
    { label: 'Receita total',  value: totalRevenue,  icon: Wallet },
    { label: 'Receita do mês', value: monthRevenue,  icon: TrendingUp },
    { label: 'Ticket médio',   value: Math.round(avgTicket), icon: ArrowUpRight },
  ]

  const goalProgress = Math.min(100, Math.round((monthRevenue / MONTHLY_GOAL) * 100))

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">Resumo financeiro</h3>

      <div className="space-y-3">
        {summary.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-dark-muted flex items-center justify-center">
                <Icon size={14} className="text-white/40" />
              </div>
              <p className="text-xs text-white/55">{label}</p>
            </div>
            <p className="text-sm font-semibold text-white">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40">Meta mensal</p>
          <p className="text-xs font-medium text-white/60">
            {formatCurrency(monthRevenue)} / {formatCurrency(MONTHLY_GOAL)}
          </p>
        </div>
        <div className="h-1.5 bg-dark-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-loa-600 rounded-full transition-all duration-700"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <p className="text-2xs text-white/30 mt-1.5">
          {goalProgress}% da meta atingida · saldo {formatCurrency(totalRevenue - totalExpense)}
        </p>
      </div>
    </div>
  )
}
