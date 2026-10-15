import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Drawer lateral/inferior baseado no Dialog do Radix (mesmo controle de foco). */
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'right' | 'left' | 'bottom' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 overflow-y-auto bg-surface p-6 shadow-2xl data-[state=open]:animate-in',
          side === 'right' && 'inset-y-0 right-0 w-[min(22rem,100%)] data-[state=open]:slide-in-from-right',
          side === 'left' && 'inset-y-0 left-0 w-[min(22rem,100%)] data-[state=open]:slide-in-from-left',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-accent hover:bg-surface-2" aria-label="Fechar">
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title className={cn('text-lg font-bold', className)} {...props} />
)
const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
)

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription }
