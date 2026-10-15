import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-sm border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/80',
        'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
