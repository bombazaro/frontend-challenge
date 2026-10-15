import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, Linkedin, Mail, ShoppingCart, Star, Twitter, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import type { Nft } from '@/contracts/api'
import { nftDetailQueryOptions, nftListQueryOptions, nftReviewsQueryOptions } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Eth } from '@/components/common/eth'
import { NotFound } from '@/components/common/not-found'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { ErrorState } from '@/components/common/states'
import { NftRow } from '@/components/nft/nft-card'
import { useAddToCart } from '@/features/cart'
import { useFavorites, useToggleFavorite } from '@/features/favorites'
import { useSession } from '@/features/session'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { errorMessage, toApiError } from '@/lib/api-error'
import { announce } from '@/realtime/announcer'
import { NETWORK_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const query = useQuery(nftDetailQueryOptions(nftId))
  useDocumentTitle(query.data?.name ?? 'Detalhes do NFT')

  if (query.isError) {
    const err = toApiError(query.error)
    if (err.code === 'NOT_FOUND') return <NotFound title="NFT não encontrado" description="Este NFT não existe ou foi removido do mercado." />
    return (
      <div className="page-container py-10">
        <ErrorState error={query.error} title="Não foi possível carregar o NFT" onRetry={() => query.refetch()} />
      </div>
    )
  }

  return (
    <div className="page-container pt-6 md:pt-8">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, ...(query.data ? [{ label: query.data.name }] : [])]} />
      </div>
      {query.data ? <NftDetail nft={query.data} /> : <NftDetailSkeleton />}
      <MoreFromCollection excludeId={nftId} />
    </div>
  )
}

function NftDetailSkeleton() {
  return (
    <div data-testid="nft-detail-skeleton" aria-busy="true" className="grid gap-8 lg:grid-cols-[100px_444px_1fr]">
      <span className="sr-only" role="status">
        Carregando NFT
      </span>
      <div className="hidden flex-col gap-4 lg:flex">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-[100px]" />
        ))}
      </div>
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

function NftDetail({ nft }: { nft: Nft }) {
  const navigate = useNavigate()
  const router = useRouter()
  const { href } = useLocation()
  const { user } = useSession()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()

  const firstAvailable = nft.editions.find((e) => e.id === nft.defaultEditionId && e.available > 0) ?? nft.editions.find((e) => e.available > 0)
  const [editionId, setEditionId] = useState(firstAvailable?.id ?? nft.defaultEditionId)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)

  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
  const unavailable = edition.available === 0
  const isFavorite = Boolean(favorites.data?.nftIds.includes(nft.id))

  // Disponibilidade pode mudar em tempo real: mantém a quantidade dentro do limite
  useEffect(() => {
    if (maxQuantity > 0 && quantity > maxQuantity) setQuantity(maxQuantity)
  }, [maxQuantity, quantity])

  const onFavorite = () => {
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.')
      navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite })
  }

  const add = (goToCart: boolean) => {
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          const msg = `${quantity}× ${nft.name} (${edition.label}) adicionado ao carrinho`
          toast.success(msg)
          announce(msg)
          if (goToCart) navigate({ to: '/carrinho' })
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/nft/${nft.id}` : ''
  const ratingRounded = Math.round(nft.rating)

  return (
    <>
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[100px_444px_1fr]">
        {/* Galeria */}
        <div className="order-2 flex gap-3 overflow-x-auto lg:order-none lg:flex-col lg:gap-4" role="group" aria-label="Galeria de imagens">
          {nft.gallery.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setImageIndex(i)}
              aria-label={`Imagem ${i + 1} de ${nft.gallery.length}`}
              aria-pressed={imageIndex === i}
              className={cn('shrink-0 overflow-hidden rounded-sm border-2', imageIndex === i ? 'border-primary' : 'border-transparent')}
            >
              <img src={src} alt="" width={100} height={100} loading="lazy" className="size-16 object-cover md:size-[100px]" />
            </button>
          ))}
        </div>

        <div className="relative order-1 -mx-4 self-start bg-surface p-5 sm:mx-0 lg:order-none">
          <button type="button" onClick={() => router.history.back()} aria-label="Voltar" className="absolute left-6 top-6 z-10 flex size-9 items-center justify-center rounded-full bg-background/80 md:hidden">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <img
            src={nft.gallery[imageIndex]}
            alt={`Arte do NFT ${nft.name}`}
            width={480}
            height={480}
            fetchPriority="high"
            className="aspect-square w-full rounded-2xl object-cover"
          />
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label="Ampliar imagem" className="absolute right-6 top-6 flex size-9 items-center justify-center rounded-full bg-background/90 hover:text-accent">
                <ZoomIn className="size-5" aria-hidden />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-3">
              <DialogTitle className="sr-only">{nft.name}</DialogTitle>
              <DialogDescription className="sr-only">Imagem ampliada do NFT</DialogDescription>
              <img src={nft.gallery[imageIndex]} alt={`Arte do NFT ${nft.name} ampliada`} width={480} height={480} className="w-full rounded-xl" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Informações */}
        <div className="order-3 lg:order-none">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold md:text-3xl">{nft.name}</h1>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full md:hidden"
              onClick={onFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart className={cn('size-5', isFavorite && 'fill-current')} aria-hidden />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <p className="text-2xl font-medium text-accent" data-testid="nft-price">
              <span className="sr-only">Preço da edição {edition.label}: </span>
              <Eth value={edition.price} />
            </p>
            <p className="flex items-center gap-2 text-sm">
              <span className="flex text-primary" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn('size-4', i < ratingRounded ? 'fill-current' : 'opacity-40')} />
                ))}
              </span>
              <span>
                <span className="sr-only">Nota {nft.rating.toFixed(1)} de 5, </span>
                {nft.reviewsCount} avaliações de colecionadores
              </span>
            </p>
          </div>

          <h2 className="mt-5 text-sm font-bold">Sobre este NFT:</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{nft.description}</p>

          <fieldset className="mt-5">
            <legend className="mb-3 text-sm font-bold">Edição:</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {nft.editions.map((e) => {
                const soldOut = e.available === 0
                return (
                  <label
                    key={e.id}
                    className={cn(
                      'relative cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      e.id === editionId ? 'border-primary font-bold text-accent' : 'border-border',
                      soldOut && 'cursor-not-allowed line-through opacity-50',
                    )}
                  >
                    <input
                      type="radio"
                      name="edition"
                      value={e.id}
                      checked={e.id === editionId}
                      disabled={soldOut}
                      onChange={() => {
                        setEditionId(e.id)
                        setQuantity(1)
                      }}
                      className="sr-only"
                    />
                    {e.label}
                    {soldOut && <span className="sr-only"> (esgotada)</span>}
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {unavailable ? 'Edição indisponível no momento.' : `${edition.available} disponível(is) · máximo ${edition.maxPerOrder} por pedido`}
            </p>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <QuantityStepper value={quantity} max={Math.max(1, maxQuantity)} onChange={setQuantity} disabled={unavailable} label={nft.name} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => add(true)} disabled={unavailable || addToCart.isPending} className="min-w-32">
                {addToCart.isPending ? 'Adicionando…' : 'COMPRAR'}
              </Button>
              <Button variant="outline" size="icon" onClick={() => add(false)} disabled={unavailable || addToCart.isPending} aria-label="Adicionar ao carrinho">
                <ShoppingCart className="size-5" aria-hidden />
              </Button>
              <Button variant="outline" onClick={onFavorite} aria-pressed={isFavorite} className="hidden font-medium md:inline-flex">
                <Heart className={cn('size-5', isFavorite && 'fill-current')} aria-hidden />
                {isFavorite ? 'Favoritado' : 'Favoritar'}
              </Button>
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-2"><dt>ID do token:</dt><dd>{nft.tokenId}</dd></div>
            <div className="flex gap-2"><dt>Coleção:</dt><dd>{nft.collection}</dd></div>
            <div className="flex gap-2"><dt>Atributos:</dt><dd>{nft.attributes.join(', ')}</dd></div>
          </dl>
          <div className="mt-4 flex items-center gap-3 text-sm font-bold">
            Compartilhar este NFT:
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (nova aba)" className="hover:text-accent"><Linkedin className="size-4" aria-hidden /></a>
            <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail" className="hover:text-accent"><Mail className="size-4" aria-hidden /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Twitter (nova aba)" className="hover:text-accent"><Twitter className="size-4" aria-hidden /></a>
          </div>
        </div>
      </div>

      <DetailTabs nft={nft} />
    </>
  )
}

function DetailTabs({ nft }: { nft: Nft }) {
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')
  const reviews = useQuery({ ...nftReviewsQueryOptions(nft.id), enabled: tab === 'avaliacoes' })
  const tabCls = (active: boolean) => cn('border-b-2 pb-2 text-base md:text-lg', active ? 'border-primary font-bold text-accent' : 'border-transparent')
  return (
    <section className="mt-16">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 border-b border-border">
        <button role="tab" id="tab-detalhes" aria-controls="painel-detalhes" aria-selected={tab === 'detalhes'} className={tabCls(tab === 'detalhes')} onClick={() => setTab('detalhes')}>
          Detalhes do NFT
        </button>
        <button role="tab" id="tab-avaliacoes" aria-controls="painel-avaliacoes" aria-selected={tab === 'avaliacoes'} className={tabCls(tab === 'avaliacoes')} onClick={() => setTab('avaliacoes')}>
          Avaliações de colecionadores ({nft.reviewsCount})
        </button>
      </div>
      {tab === 'detalhes' ? (
        <div role="tabpanel" id="painel-detalhes" aria-labelledby="tab-detalhes" className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
          {nft.details.map((p) => <p key={p}>{p}</p>)}
          <div><h3 className="font-bold text-foreground">Rede:</h3><p>Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.</p></div>
          <div><h3 className="font-bold text-foreground">Contrato:</h3><p>Direitos autorais do criador: {nft.royaltyPct}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p></div>
          <div><h3 className="font-bold text-foreground">Endereço do contrato:</h3><p>{nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)} • Contrato inteligente ERC-721 verificado.</p></div>
        </div>
      ) : (
        <div role="tabpanel" id="painel-avaliacoes" aria-labelledby="tab-avaliacoes" className="mt-5">
          {reviews.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : reviews.isError ? (
            <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
          ) : (
            <ul className="space-y-4">
              {reviews.data.map((r) => (
                <li key={r.id} className="rounded-md bg-surface p-4 text-sm">
                  <p className="font-bold">{r.author} <span className="font-normal text-accent">· {r.rating}/5</span></p>
                  <p className="mt-1 text-muted-foreground">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function MoreFromCollection({ excludeId }: { excludeId: string }) {
  const list = useQuery(nftListQueryOptions({ page: 1, pageSize: 6, sort: 'recentes', tab: 'todos' }))
  const items = list.data?.items.filter((i) => i.id !== excludeId).slice(0, 5)
  return (
    <>
      <NftRow title="Mais desta coleção" items={items} loading={list.isPending} />
      <p className="sr-only">
        <Link to="/">Ver catálogo completo</Link>
      </p>
    </>
  )
}
