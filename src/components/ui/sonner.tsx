import { Toaster as Sonner } from 'sonner'

/** Toasts acessíveis (região aria-live) com o tema da Kurio. */
function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-surface !text-foreground !border !border-border !font-mono',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
        },
      }}
    />
  )
}

export { Toaster }
