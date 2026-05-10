import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-[0.04em] text-[10px] transition-colors',
  {
    variants: {
      variant: {
        income:   'bg-[var(--success-tint)] text-[var(--success)]',
        expense:  'bg-[var(--accent-tint)] text-[var(--accent)]',
        cash:     'bg-[var(--surface-alt)] text-[var(--text)]',
        tf:       'bg-[#E8F0FB] text-[#2055A8]',
        qris:     'bg-[#F2EAFB] text-[#7028C2]',
        paid:     'bg-[var(--success-tint)] text-[var(--success)]',
        pending:  'bg-[var(--warning-tint)] text-[var(--warning)]',
        open:     'bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)]',
        closed:   'bg-[var(--text)] text-white',
        default:  'bg-[var(--surface-alt)] text-[var(--text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type BadgeVariant = 'income' | 'expense' | 'cash' | 'tf' | 'qris' | 'paid' | 'pending' | 'open' | 'closed' | 'default'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
