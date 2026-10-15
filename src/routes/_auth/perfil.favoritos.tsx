import { useQueries } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { nftDetailQueryOptions } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/common/states'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { useFavorites } from '@/features/favorites'
import { useDocumentTitle } from '@/hooks/use-document-title'

export const Route = createFileRoute('/_auth/perfil/favoritos')({
  component: FavoritesPage,
})

function FavoritesPage() {
  useDocumentTitle('Lista de interesse')
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const nfts = useQueries({ queries: ids.map((id) => nftDetailQueryOptions(id)) })

  return (
    <section aria-labelledby="fav-titulo">
      <h2 id="fav-titulo" className="mb-6 font-bold">
        Lista de interesse
      </h2>
      {favorites.isError ? (
        <ErrorState error={favorites.error} onRetry={() => favorites.refetch()} />
      ) : favorites.isPending ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <NftCardSkeleton key={i} />)}</div>
      ) : ids.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Toque em Favoritar na página de um NFT para salvá-lo aqui."
          action={
            <Button asChild size="sm">
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {nfts.map((q, i) => (q.data ? <NftCard key={q.data.id} nft={q.data} /> : <NftCardSkeleton key={ids[i]} />))}
        </div>
      )}
    </section>
  )
}
