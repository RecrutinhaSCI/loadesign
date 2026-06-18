import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTransactionsStore } from '@/store/transactions.store'
import { useLeadsStore } from '@/store/leads.store'
import { formatCurrency } from '@/lib/utils'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ─────────────────────────────────────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-modal text-sm">
      <p className="text-white/40 text-xs mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-loa-500" />
          <span className="text-white font-semibold">
            {p.dataKey === 'revenue' ? formatCurrency(p.value) : `${p.value} leads`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive monthly series from store
// ─────────────────────────────────────────────────────────────────────────────
function useMonthlyData() {
  const transactions = useTransactionsStore((s) => s.items)
  const leads = useLeadsStore((s) => s.items)

  return useMemo(() => {
    const now = new Date()
    const months: { label: string; revenue: number; leads: number; ts: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const ts = d.getTime()

      const revenue = transactions
        .filter((t) => t.type === 'income')
        .filter((t) => {
          const dt = new Date(t.date)
          return dt >= d && dt < next
        })
        .reduce((s, t) => s + t.value, 0)

      const leadsInMonth = leads.filter((l) => {
        const dt = new Date(l.createdAt)
        return dt >= d && dt < next
      }).length

      months.push({
        label: MONTH_LABELS[d.getMonth()],
        revenue,
        leads: leadsInMonth,
        ts,
      })
    }
    return months
  }, [transactions, leads])
}

// ─────────────────────────────────────────────────────────────────────────────
// RevenueChart
// ─────────────────────────────────────────────────────────────────────────────
export function RevenueChart() {
  const data = useMonthlyData()
  const totalRevenue = data.reduce((s, m) => s + m.revenue, 0)
  const lastMonth = data[data.length - 2]?.revenue ?? 0
  const currentMonth = data[data.length - 1]?.revenue ?? 0
  const growth = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0
  const growthLabel = growth >= 0 ? `↑ ${growth.toFixed(1)}%` : `↓ ${Math.abs(growth).toFixed(1)}%`

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Receita · últimos 7 meses</p>
          <p className="text-xl font-semibold text-white mt-0.5">{formatCurrency(totalRevenue)}</p>
        </div>
        <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${
          growth >= 0
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-red-400 bg-red-500/10 border-red-500/20'
        }`}>
          {growthLabel} vs mês ant.
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#B08B7D" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#B08B7D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f1f23" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }}
            tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#B08B7D', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#B08B7D"
            strokeWidth={2}
            fill="url(#revenue-gradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#B08B7D', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
