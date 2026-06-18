import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Button component — all variants
// ─────────────────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-loa-600 hover:bg-loa-700 text-white shadow-glow-sm hover:shadow-glow-loa border border-loa-700',
  secondary: 'bg-dark-muted hover:bg-dark-hover text-white border border-dark-border',
  ghost:     'bg-transparent hover:bg-dark-hover text-white/70 hover:text-white border border-transparent',
  danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40',
  outline:   'bg-transparent border border-dark-border hover:border-loa-600/50 text-white/70 hover:text-white',
}

const sizeClasses: Record<Size, string> = {
  sm:   'h-8  px-3   text-xs  gap-1.5 rounded-lg',
  md:   'h-9  px-4   text-sm  gap-2   rounded-lg',
  lg:   'h-11 px-6   text-sm  gap-2   rounded-xl',
  icon: 'h-9  w-9    text-sm         rounded-lg justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, leftIcon, rightIcon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center font-medium transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-loa-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {size !== 'icon' && children}
      {!loading && rightIcon}
    </button>
  )
)
Button.displayName = 'Button'
