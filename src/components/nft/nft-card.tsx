import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Eth } from '@/components/common/eth'
import { cn } from '@/lib/utils'

export function NftCard({ nft, priority = false, className }: { nft: NftSummary; priority?: boolean; className?: string }) {
  return (
    <article className={cn('group relative', className)} data-testid="nft-card">
      <div className="relative bg-surface p-1 pb-5 transition-transform group-hover:-translate-y-1">
        {nft.badge && <span className="absolute left-0 top-4 z-10 bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{nft.badge}</span>}
        {nft.soldOut && <span className="absolute right-2 top-4 z-10 rounded-sm bg-background/90 px-2 py-1 text-xs font-bold text-destructive">ESGOTADO</span>}
        <img
          src={nft.image}
          alt={`Arte do NFT ${nft.name}`}
          width={480}
          height={480}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full rounded-xl object-cover"
        />
      </div>
      <h3 className="mt-3 text-sm md:text-base">
        {/* O link cobre todo o card (área de clique maior) mantendo um único alvo de foco */}
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="after:absolute after:inset-0 focus-visible:outline-none group-has-[:focus-visible]:underline">
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-base font-bold text-accent md:text-lg">
        <Eth value={nft.price} />
        {nft.compareAtPrice && (
          <s className="font-normal text-muted-foreground">
            <span className="sr-only">Preço anterior: </span>
            <Eth value={nft.compareAtPrice} />
          </s>
        )}
      </p>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div data-testid="nft-card-skeleton" aria-hidden>
      <div className="bg-surface p-1 pb-5">
        <Skeleton className="aspect-square w-full rounded-xl bg-surface-2" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-6 w-1/3" />
    </div>
  )
}

/** Linha horizontal de cards (Mais desta coleção / Colecionadores também viram) */
export function NftRow({ title, items, loading }: { title: string; items?: NftSummary[]; loading?: boolean }) {
  return (
    <section aria-labelledby={`row-${title}`} className="mt-16">
      <h2 id={`row-${title}`} className="border-b border-border pb-3 text-lg font-bold text-accent">
        {title}
      </h2>
      <div className="mt-8 grid snap-x auto-cols-[minmax(10rem,1fr)] grid-flow-col gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {loading || !items
          ? Array.from({ length: 5 }, (_, i) => <NftCardSkeleton key={i} />)
          : items.map((nft) => <NftCard key={nft.id} nft={nft} className="snap-start" />)}
      </div>
    </section>
  )
}
