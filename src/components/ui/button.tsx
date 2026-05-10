import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--text)] text-[var(--bg)] hover:bg-[var(--text-secondary)] rounded-btn',
        accent:
          'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] rounded-btn',
        secondary:
          'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-deep)] hover:border-[var(--border-strong)] rounded-btn',
        ghost:
          'text-[var(--text-secondary)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] rounded-btn',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-alt)] rounded-btn',
        link:
          'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
        destructive:
          'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] rounded-btn',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
