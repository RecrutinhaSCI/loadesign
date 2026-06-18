import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-dark-muted border border-dark-border flex items-center justify-center mb-4">
          <Icon size={20} className="text-white/20" />
        </div>
      )}
      <h3 className="text-sm font-medium text-white/60 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-white/30 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
