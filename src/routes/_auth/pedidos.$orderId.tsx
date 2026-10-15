import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, MailOpen, X, XCircle } from 'lucide-react'
import type { Order } from '@/contracts/api'
import { ordersApi } from '@/api/orders'
import { qk } from '@/api/keys'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eth } from '@/components/common/eth'
import { NotFound } from '@/components/common/not-found'
import { ErrorState } from '@/components/common/states'
import { clearCheckoutAttempt, clearPendingOrder } from '@/features/checkout'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { toApiError } from '@/lib/api-error'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/labels'
import { formatDate, shortAddress } from '@/lib/utils'
import { useRealtimeStatus } from '@/realtime/RealtimeProvider'

export const Route = createFileRoute('/_auth/pedidos/$orderId')({
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const realtime = useRealtimeStatus()
  const order = useQuery({
    queryKey: qk.order(user.id, orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    // Fallback ao tempo real: enquanto pendente, consulta periodicamente (recupera após refresh/queda)
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 4_000 : false),
  })
  const status = order.data?.status
  useDocumentTitle(status === 'confirmed' ? 'Pedido confirmado' : status === 'refused' ? 'Pagamento recusado' : 'Pedido em processamento')

  // Estados terminais encerram a tentativa de compra
  useEffect(() => {
    if (status === 'confirmed' || status === 'refused') {
      clearPendingOrder()
      clearCheckoutAttempt()
    }
  }, [status])

  if (order.isError) {
    const code = toApiError(order.error).code
    if (code === 'NOT_FOUND' || code === 'FORBIDDEN') return <NotFound title="Pedido não encontrado" description="Este pedido não existe ou não pertence à sua conta." />
    return (
      <div className="page-container py-10">
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </div>
    )
  }

  return (
    <div className="page-container flex justify-center py-10 md:py-20">
      <div className="w-full max-w-[578px]">
        {!order.data ? (
          <Skeleton className="h-96 w-full" />
        ) : order.data.status === 'pending' ? (
          <PendingCard order={order.data} reconnecting={realtime === 'reconnecting'} />
        ) : order.data.status === 'confirmed' ? (
          <Receipt order={order.data} />
        ) : (
          <RefusedCard order={order.data} />
        )}
      </div>
    </div>
  )
}

function PendingCard({ order, reconnecting }: { order: Order; reconnecting: boolean }) {
  return (
    <section role="status" aria-live="polite" className="flex flex-col items-center gap-4 border-b-8 border-b-primary bg-surface px-6 py-12 text-center" data-testid="order-pending">
      <Loader2 className="size-10 animate-spin text-accent" aria-hidden />
      <h1 className="text-xl font-bold">Aguardando confirmação da rede…</h1>
      <p className="text-sm text-muted-foreground">
        Pedido <strong>{order.id}</strong> enviado para a {NETWORK_LABELS[order.network]}. Você pode sair desta página: o pedido não será duplicado.
      </p>
      {reconnecting && <p className="text-xs text-destructive">Conexão em tempo real interrompida. Reconectando e consultando o status…</p>}
      <p className="text-lg font-bold text-accent">
        <Eth value={order.total} minDecimals={3} />
      </p>
    </section>
  )
}

function RefusedCard({ order }: { order: Order }) {
  return (
    <section role="alert" className="flex flex-col items-center gap-4 border-b-8 border-b-destructive bg-surface px-6 py-12 text-center" data-testid="order-refused">
      <XCircle className="size-12 text-destructive" aria-hidden />
      <h1 className="text-xl font-bold">Pagamento recusado</h1>
      <p className="text-sm text-muted-foreground">{order.failureReason}</p>
      <p className="text-sm">Seus itens continuam no carrinho. Você pode tentar novamente.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/pagamento">Tentar novamente</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/carrinho">Ver carrinho</Link>
        </Button>
      </div>
    </section>
  )
}

/** Recibo: reproduz o snapshot do pedido (não lê o catálogo atual). */
function Receipt({ order }: { order: Order }) {
  const navigate = useNavigate()
  return (
    <section aria-labelledby="recibo-titulo" className="relative border-b-[10px] border-b-primary bg-surface" data-testid="order-receipt">
      <button type="button" onClick={() => navigate({ to: '/' })} aria-label="Fechar recibo e voltar ao início" className="absolute right-5 top-5 rounded-sm p-1 text-accent hover:bg-surface-2">
        <X className="size-5" aria-hidden />
      </button>
      <div className="flex flex-col items-center gap-4 border-b border-primary px-6 py-6">
        <MailOpen className="size-16 text-accent" aria-hidden strokeWidth={1.25} />
        <h1 id="recibo-titulo" className="text-center font-bold text-muted-foreground">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-b border-primary px-6 py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary">
        <div className="sm:pr-3">
          <dt className="font-bold text-muted-foreground">ID da transação</dt>
          <dd className="text-muted-foreground" data-testid="tx-hash" title={order.txHash ?? ''}>{order.txHash ? shortAddress(order.txHash) : '—'}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-muted-foreground">Data</dt>
          <dd className="text-muted-foreground">{formatDate(order.updatedAt)}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-muted-foreground"><Eth value={order.total} minDecimals={3} /></dd>
        </div>
        <div className="sm:pl-3">
          <dt className="font-bold text-muted-foreground">Carteira</dt>
          <dd className="text-muted-foreground">{PROVIDER_LABELS[order.wallet.provider]}</dd>
        </div>
      </dl>
      <div className="px-6 py-6 sm:px-11">
        <h2 className="font-bold">Detalhes da transação</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Itens comprados</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-2 font-medium">NFTs</th>
              <th scope="col" className="pb-2 text-center font-medium">Edições</th>
              <th scope="col" className="pb-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.cartItemId}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img src={l.image} alt="" width={64} height={64} className="size-16 rounded-sm object-cover" />
                    <span>
                      <span className="block font-bold">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">ID do token: {l.tokenId} · {l.editionLabel}</span>
                    </span>
                  </div>
                </td>
                <td className="text-center">(x {l.quantity})</td>
                <td className="text-right font-bold text-accent"><Eth value={l.lineTotal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 grid grid-cols-2 gap-2 border-b border-border pb-3 text-sm">
          {order.discount !== '0' && (
            <>
              <dt className="text-right sm:pr-8">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="text-right">(-) <Eth value={order.discount} /></dd>
            </>
          )}
          <dt className="text-right sm:pr-8">Taxa de rede</dt>
          <dd className="text-right text-base"><Eth value={order.networkFee} minDecimals={3} /></dd>
          <dt className="text-right font-bold sm:pr-8">Total</dt>
          <dd className="text-right text-lg font-bold text-accent" data-testid="receipt-total"><Eth value={order.total} minDecimals={3} /></dd>
        </dl>
        <p className="mt-4 text-center text-sm leading-6 text-muted-foreground">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira conectada ({shortAddress(order.wallet.address)}) e registrada na rede.
        </p>
        {order.explorerUrl && (
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <a href={order.explorerUrl} target="_blank" rel="noopener noreferrer">
                Ver no Etherscan <span className="sr-only">(link simulado, abre em nova aba)</span>
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
