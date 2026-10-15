import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      outline: 'border border-primary text-accent',
      success: 'border border-success/60 text-success',
      warning: 'border border-destructive/70 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
