import { AlertTriangle, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api-error'

export function ErrorState({ error, onRetry, title = 'Algo deu errado' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-10 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <p className="font-bold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-12 text-center">
      <SearchX className="size-8 text-accent" aria-hidden />
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
