import type { UseQueryResult } from '@tanstack/react-query'
import type { Quote } from '@/contracts/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Eth } from '@/components/common/eth'
import { ErrorState } from '@/components/common/states'
import { cn } from '@/lib/utils'

/** Resumo de valores: sempre o retorno da API de cotação (nunca recalculado no cliente). */
export function QuoteSummary({ quote, className }: { quote: UseQueryResult<Quote>; className?: string }) {
  if (quote.isError) return <ErrorState error={quote.error} title="Não foi possível calcular o total" onRetry={() => quote.refetch()} />
  if (!quote.data) {
    return (
      <div className={cn('mt-6 flex flex-col gap-4', className)} aria-busy="true" data-testid="quote-skeleton">
        <span className="sr-only" role="status">
          Calculando valores
        </span>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }
  const q = quote.data
  return (
    <dl
      className={cn('mt-6 flex flex-col gap-3 text-sm transition-opacity md:text-base', quote.isFetching && 'opacity-60', className)}
      aria-busy={quote.isFetching}
      data-testid="quote-summary"
      data-quote-id={q.id}
    >
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd data-testid="quote-subtotal"><Eth value={q.subtotal} /></dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Desconto do lançamento{q.coupon ? ` (${q.coupon.code})` : ''}</dt>
        <dd data-testid="quote-discount" className="whitespace-nowrap">(-) <Eth value={q.discount} /></dd>
      </div>
      <div className="flex justify-between">
        <dt>Taxa de rede</dt>
        <dd className="text-right">
          <Eth value={q.networkFee} />
          <span className="block text-[11px] text-accent">Taxa estimada</span>
        </dd>
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-4 font-bold">
        <dt>Total</dt>
        <dd className="text-lg text-accent" data-testid="quote-total"><Eth value={q.total} minDecimals={3} /></dd>
      </div>
      {q.issues.length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/50 p-3 text-xs text-destructive">
          <ul className="list-inside list-disc space-y-1">
            {q.issues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}
    </dl>
  )
}
