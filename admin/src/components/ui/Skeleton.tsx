import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      {...props}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-dark-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton
            className="h-4 w-full"
            style={{ width: `${60 + i * 5}%` }}
          />
        </td>
      ))}
    </tr>
  )
}