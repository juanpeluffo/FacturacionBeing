import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent/10 text-accent border-accent/20',
        secondary: 'bg-surface-2 text-muted-2 border-border',
        success: 'bg-green-400/10 text-green-400 border-green-400/20',
        warning: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
        destructive: 'bg-red-400/10 text-red-400 border-red-400/20',
        outline: 'border-border text-muted-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
