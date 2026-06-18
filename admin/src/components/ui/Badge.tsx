import { cn } from '@/lib/utils'
import type { LeadStatus } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Badge component — semantic status colors
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
  dot?: boolean
  className?: string
}

const variantMap = {
  default: 'bg-white/8 text-white/70 border border-white/10',
  success: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  danger:  'bg-red-500/12 text-red-400 border border-red-500/20',
  info:    'bg-blue-500/12 text-blue-400 border border-blue-500/20',
  muted:   'bg-dark-muted text-white/30 border border-dark-border',
}

const dotMap = {
  default: 'bg-white/40',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
  muted:   'bg-white/20',
}

export function Badge({ children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variantMap[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotMap[variant])} />
      )}
      {children}
    </span>
  )
}

// ── Lead status badge ─────────────────────────────────────────────────────────
const statusConfig: Record<
  LeadStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  new:        { label: 'Novo',              variant: 'info' },
  contacted:  { label: 'Contatado',         variant: 'warning' },
  qualified:  { label: 'Qualificado',       variant: 'info' },
  proposal:   { label: 'Proposta enviada',  variant: 'warning' },
  won:        { label: 'Fechado',           variant: 'success' },
  lost:       { label: 'Perdido',           variant: 'danger' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, variant } = statusConfig[status]
  return <Badge variant={variant} dot>{label}</Badge>
}

export { statusConfig }
