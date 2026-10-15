import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CartItem } from '@/contracts/api'
import { nftListQueryOptions } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Eth } from '@/components/common/eth'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { EmptyState, ErrorState } from '@/components/common/states'
import { NftRow } from '@/components/nft/nft-card'
import { QuoteSummary } from '@/components/cart/quote-summary'
import { CouponForm } from '@/components/cart/coupon-form'
import { useAcknowledgeCart, useCart, useQuote, useRemoveCartItem, useUpdateCartItem } from '@/features/cart'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage } from '@/lib/api-error'
import { formatEth } from '@/lib/money'
import { announce } from '@/realtime/announcer'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  useDocumentTitle('Carrinho')
  const cart = useCart()
  const quote = useQuote('ethereum')
  const navigate = useNavigate()
  const router = useRouter()
  const suggestions = useQuery(nftListQueryOptions({ page: 1, pageSize: 5, sort: 'populares', tab: 'todos' }))

  const items = cart.data?.items ?? []
  const hasIssues = items.some((i) => i.issue)
  // Itens esgotados/com estoque reduzido bloqueiam a finalização (estado vindo do servidor)
  const blocked = items.some((i) => i.issue === 'sold_out' || i.issue === 'quantity_reduced') || quote.data?.purchasable === false

  return (
    <div className="page-container pt-6 md:pt-8">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
      </div>
      <div className="mb-6 flex items-center gap-4 md:hidden">
        <button type="button" onClick={() => router.history.back()} aria-label="Voltar" className="flex size-9 items-center justify-center rounded-full bg-surface">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold">Carrinho de NFTs</h1>
        <span className="size-9" aria-hidden />
      </div>
      <h1 className="sr-only md:not-sr-only md:mb-4 md:text-base md:font-bold">Carrinho de NFTs</h1>

      {cart.isError ? (
        <ErrorState error={cart.error} title="Não foi possível carregar o carrinho" onRetry={() => cart.refetch()} />
      ) : cart.isPending ? (
        <CartSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione NFTs para continuar."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_332px] lg:gap-20">
          <section aria-label="Itens do carrinho">
            {hasIssues && <CartIssuesBanner />}
            <div className="hidden grid-cols-[1fr_110px_120px_110px_40px] gap-4 border-b border-border pb-3 text-base md:grid" aria-hidden>
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((item) => (
                <CartRow key={item.id} item={item} />
              ))}
            </ul>
          </section>

          <aside aria-labelledby="resumo-titulo" className="lg:sticky lg:top-6 lg:self-start">
            <h2 id="resumo-titulo" className="border-b border-border pb-3 text-lg font-bold">
              Resumo da carteira
            </h2>
            <CouponForm />
            <QuoteSummary quote={quote} />
            <Button
              size="lg"
              className="mt-6 w-full rounded-xl md:rounded-md"
              disabled={blocked || !quote.data || quote.isFetching}
              onClick={() => navigate({ to: '/pagamento' })}
            >
              Conectar e finalizar
            </Button>
            {blocked && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                Remova ou ajuste os itens indisponíveis para continuar.
              </p>
            )}
            <Link to="/" className="mt-4 block text-center text-accent hover:underline">
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}

      <NftRow title="Colecionadores também viram" items={suggestions.data?.items} loading={suggestions.isPending} />
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_332px] lg:gap-20" aria-busy="true" data-testid="cart-skeleton">
      <span className="sr-only" role="status">
        Carregando carrinho
      </span>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[70px] w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function CartIssuesBanner() {
  const acknowledge = useAcknowledgeCart()
  return (
    <div role="alert" className="mb-4 flex flex-col gap-3 rounded-md border border-destructive/60 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        Alguns itens mudaram de preço ou disponibilidade enquanto você navegava. Revise os valores destacados.
      </p>
      <Button size="sm" variant="outline" onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending}>
        Entendi, atualizar
      </Button>
    </div>
  )
}

function issueText(item: CartItem) {
  switch (item.issue) {
    case 'price_changed':
      return `Preço alterado: era ${formatEth(item.acknowledgedPrice)}`
    case 'sold_out':
      return 'Edição esgotada — remova o item'
    case 'quantity_reduced':
      return `Restam apenas ${item.maxQuantity} unidade(s)`
    default:
      return null
  }
}

function CartRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const issue = issueText(item)

  const changeQty = (quantity: number) =>
    update.mutate(
      { itemId: item.id, quantity },
      {
        onSuccess: () => announce(`Quantidade de ${item.name} alterada para ${quantity}`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <li
      data-testid="cart-item"
      className="grid grid-cols-[96px_1fr] gap-x-3 overflow-hidden rounded-xl bg-surface md:grid-cols-[1fr_110px_120px_110px_40px] md:items-center md:gap-4 md:rounded-none"
    >
      <div className="row-span-3 md:row-span-1 md:flex md:items-center md:gap-4">
        <img src={item.image} alt="" width={70} height={70} className="h-full w-24 object-cover md:size-[70px]" />
        <div className="hidden md:block">
          <p className="font-bold">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            ID do token: {item.tokenId} · Edição {item.editionLabel}
          </p>
        </div>
      </div>
      <div className="pt-3 md:hidden">
        <p className="font-bold">{item.name}</p>
        <p className="text-sm text-muted-foreground">Edição: {item.editionLabel}</p>
      </div>
      <p className="font-bold text-accent md:pt-0">
        <span className="sr-only">Preço unitário: </span>
        <Eth value={item.unitPrice} />
      </p>
      <div className="flex items-center justify-between pb-3 pr-3 md:p-0">
        <QuantityStepper size="sm" value={item.quantity} max={Math.max(item.maxQuantity, 1)} onChange={changeQty} disabled={update.isPending || item.issue === 'sold_out'} label={item.name} />
        <button
          type="button"
          onClick={() => remove.mutate(item.id, { onSuccess: () => announce(`${item.name} removido do carrinho`), onError: (e) => toast.error(errorMessage(e)) })}
          disabled={remove.isPending}
          aria-label={`Remover ${item.name} do carrinho`}
          className="rounded-sm p-1 text-muted-foreground hover:text-destructive md:hidden"
        >
          <Trash2 className="size-5" aria-hidden />
        </button>
      </div>
      <p className="hidden font-bold text-accent md:block">
        <span className="sr-only">Total do item: </span>
        <Eth value={item.lineTotal} />
      </p>
      <button
        type="button"
        onClick={() => remove.mutate(item.id, { onSuccess: () => announce(`${item.name} removido do carrinho`), onError: (e) => toast.error(errorMessage(e)) })}
        disabled={remove.isPending}
        aria-label={`Remover ${item.name} do carrinho`}
        className="hidden rounded-sm p-1 text-muted-foreground hover:text-destructive md:block"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
      {issue && (
        <p data-testid="cart-item-issue" className="col-span-2 flex items-center gap-2 bg-destructive/10 px-3 py-2 text-xs text-destructive md:col-span-5">
          <AlertTriangle className="size-4" aria-hidden /> {issue}
        </p>
      )}
    </li>
  )
}
