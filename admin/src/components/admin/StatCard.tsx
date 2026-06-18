import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'primary'
  delay?: number
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', delay = 0 }: StatCardProps) {
  const isUp = (trend?.value ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'card p-5 group hover:shadow-card-hover transition-all duration-300 cursor-default',
        variant === 'primary' && 'bg-loa-600/10 border-loa-600/20 hover:border-loa-600/30'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wide">{title}</p>
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
          variant === 'primary'
            ? 'bg-loa-600/20 text-loa-400'
            : 'bg-dark-muted text-white/30 group-hover:text-white/50'
        )}>
          <Icon size={15} />
        </div>
      </div>

      <p className={cn(
        'text-2xl font-semibold tracking-tight',
        variant === 'primary' ? 'text-loa-400' : 'text-white'
      )}>
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>
      )}

      {trend && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-dark-border">
          <span className={cn(
            'text-xs font-medium',
            isUp ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-white/25">{trend.label}</span>
        </div>
      )}
    </motion.div>
  )
}
