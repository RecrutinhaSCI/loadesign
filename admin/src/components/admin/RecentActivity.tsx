import { motion } from 'framer-motion'
import {
  UserPlus,
  CheckCircle,
  Play,
  Package,
} from 'lucide-react'
import { mockActivities } from '@/data/mock'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

function getActivityVisual(action: string) {
  if (action.includes('fechou')) {
    return {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    }
  }

  if (action.includes('enviou')) {
    return {
      icon: Play,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    }
  }

  if (action.includes('adicionou')) {
    return {
      icon: UserPlus,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    }
  }

  return {
    icon: Package,
    color: 'text-loa-400',
    bg: 'bg-loa-600/10 border-loa-600/20',
  }
}

export function RecentActivity() {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">
        Atividade recente
      </h3>

      <div className="space-y-3">
        {mockActivities.map((item, i) => {
          const {
            icon: Icon,
            color,
            bg,
          } = getActivityVisual(item.action)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.06,
                duration: 0.25,
              }}
              className="flex items-start gap-3"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0',
                  bg
                )}
              >
                <Icon
                  size={13}
                  className={color}
                />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs text-white/65 leading-snug">
                  <span className="font-medium">
                    {item.userName}
                  </span>{' '}
                  {item.action}{' '}
                  <span className="font-medium">
                    {item.target}
                  </span>
                </p>

                <p className="text-2xs text-white/25 mt-0.5">
                  {formatRelative(item.createdAt)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}