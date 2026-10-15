import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/contracts/schemas'
import { featuredQueryOptions, nftListQueryOptions, searchToParams } from '@/api/nfts'
import { Hero } from '@/components/catalog/hero'
import { CatalogSection } from '@/components/catalog/catalog-section'
import { Journal, Promos } from '@/components/catalog/editorial'
import { useDocumentTitle } from '@/hooks/use-document-title'

export const Route = createFileRoute('/')({
  // Busca, filtros, ordenação e paginação vivem na URL (sobrevivem a refresh e histórico)
  validateSearch: (search) => catalogSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  // Prefetch sem bloquear a navegação: a UI mostra skeletons enquanto carrega
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(nftListQueryOptions(searchToParams(deps)))
    context.queryClient.prefetchQuery(featuredQueryOptions)
  },
  component: HomePage,
})

export function HomePage() {
  const search = Route.useSearch()
  useDocumentTitle('Marketplace de NFTs')
  return (
    <>
      <Hero />
      <CatalogSection search={search} />
      <Promos />
      <Journal />
    </>
  )
}
