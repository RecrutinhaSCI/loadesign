import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore } from '@/store/toast.store'
import { cn } from '@/lib/utils'
import type { Toast } from '@/store/toast.store'

const icons = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const toastStyles = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error:   'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = icons[toast.variant === 'default' ? 'info' : toast.variant]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex items-start gap-3 w-80 p-4 rounded-xl border',
        'bg-dark-card shadow-card-dark',
        'pointer-events-auto'
      )}
    >
      <div
  className={cn(
    'rounded-lg p-1.5 shrink-0',
    toastStyles[toast.variant as keyof typeof toastStyles]
  )}
>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-white/20 hover:text-white/60 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
