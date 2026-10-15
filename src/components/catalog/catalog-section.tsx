import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Search, SlidersHorizontal } from 'lucide-react'
import { CATALOG_SORTS, CATALOG_TABS, type CatalogSort } from '@/contracts/api'
import type { CatalogSearch } from '@/contracts/schemas'
import { featuredQueryOptions, nftListQueryOptions, searchToParams } from '@/api/nfts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { EmptyState, ErrorState } from '@/components/common/states'
import { SORT_LABELS, TAB_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { CatalogFilters } from './filters'
import { Pagination } from './pagination'

/** Remove valores padrão/vazios para manter a URL limpa e estável. */
function cleanSearch(s: CatalogSearch): CatalogSearch {
  const out: CatalogSearch = { ...s }
  if (!out.q) delete out.q
  if (!out.categoria?.length) delete out.categoria
  if (!out.rede?.length) delete out.rede
  if (out.min === undefined) delete out.min
  if (out.max === undefined) delete out.max
  if (!out.aba || out.aba === 'todos') delete out.aba
  if (!out.ordem || out.ordem === 'recentes') delete out.ordem
  if (!out.pagina || out.pagina === 1) delete out.pagina
  return out
}

function FeaturedCard() {
  const featured = useQuery(featuredQueryOptions)
  const nft = featured.data?.[1]
  return (
    <aside aria-label="NFT em destaque" className="mt-6 overflow-hidden bg-gradient-to-b from-surface-2 to-surface">
      <div className="p-5">
        <p className="text-2xl font-bold text-accent">NFT EM DESTAQUE</p>
        <p className="mt-2 text-center text-xl font-bold">OFERTA LIMITADA</p>
      </div>
      <img src="/nfts/sage-nomad.webp" alt={nft ? `Arte do NFT ${nft.name}` : ''} width={480} height={480} loading="lazy" className="aspect-[310/366] w-full rounded-2xl object-cover" />
      {nft && (
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block p-4 text-center text-sm font-bold text-accent hover:underline">
          Ver {nft.name}
        </Link>
      )}
    </aside>
  )
}

export function CatalogSection({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate({ from: '/' })
  const params = searchToParams(search)
  const list = useQuery(nftListQueryOptions(params))
  const [term, setTerm] = useState(search.q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const update = (patch: Partial<CatalogSearch>, opts: { replace?: boolean } = {}) => {
    navigate({
      search: (prev: CatalogSearch) => cleanSearch({ ...prev, ...patch, pagina: 'pagina' in patch ? patch.pagina : undefined }),
      replace: opts.replace,
      resetScroll: false,
    })
  }

  // Sincroniza o campo com a URL (voltar/avançar no histórico)
  useEffect(() => setTerm(search.q ?? ''), [search.q])

  // Debounce da busca: substitui a entrada do histórico enquanto digita
  useEffect(() => {
    if (term === (search.q ?? '')) return
    const t = setTimeout(() => update({ q: term.trim() || undefined }, { replace: true }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  const data = list.data
  const activeTab = search.aba ?? 'todos'
  const busy = list.isFetching && list.isPlaceholderData

  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="page-container mt-10 scroll-mt-4 md:mt-24">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      {/* Busca (+ filtros no mobile) */}
      <div className="mb-6 flex items-center gap-3">
        <form role="search" className="relative flex-1" onSubmit={(e) => (e.preventDefault(), update({ q: term.trim() || undefined }))}>
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar NFTs
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="busca-catalogo"
            type="search"
            placeholder="Explorar coleções"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-11 rounded-xl border-0 bg-surface pl-11 md:h-10 md:rounded-sm md:border md:bg-transparent"
          />
        </form>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="size-11 rounded-xl lg:hidden" aria-label="Abrir filtros">
              <SlidersHorizontal className="size-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os filtros são aplicados imediatamente ao catálogo.</SheetDescription>
            <CatalogFilters search={search} facets={data?.facets} onChange={(p) => update(p)} />
            <Button onClick={() => setFiltersOpen(false)}>Ver {data?.total ?? 0} resultados</Button>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-12 lg:grid-cols-[310px_1fr]">
        <div className="hidden lg:block">
          <div className="bg-surface p-5">
            <CatalogFilters search={search} facets={data?.facets} onChange={(p) => update(p)} />
          </div>
          <FeaturedCard />
        </div>

        <div className="min-w-0">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between lg:flex-col lg:items-start xl:flex-row xl:items-center">
            <div role="tablist" aria-label="Seções do catálogo" className="flex min-w-0 max-w-full gap-5 overflow-x-auto">
              {CATALOG_TABS.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  type="button"
                  aria-selected={activeTab === tab}
                  onClick={() => update({ aba: tab })}
                  className={cn('whitespace-nowrap border-b-2 pb-1 text-sm font-bold md:text-base', activeTab === tab ? 'border-primary text-accent' : 'border-transparent')}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm md:text-base">
              <span>Ordenar por:</span>
              <select
                value={search.ordem ?? 'recentes'}
                onChange={(e) => update({ ordem: e.target.value as CatalogSort })}
                className="cursor-pointer rounded-sm bg-background py-1 pr-1 text-foreground"
              >
                {CATALOG_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {list.isPending ? 'Carregando NFTs' : data ? `${data.total} NFTs encontrados` : ''}
          </p>

          {list.isError ? (
            <ErrorState error={list.error} title="Não foi possível carregar o catálogo" onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8" aria-busy="true">
              {Array.from({ length: 9 }, (_, i) => (
                <NftCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Nenhum NFT encontrado"
              description="Ajuste a busca ou os filtros para ver mais resultados."
              action={
                <Button variant="outline" size="sm" onClick={() => navigate({ search: {}, resetScroll: false })}>
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <div
              data-testid="catalog-grid"
              aria-busy={busy}
              className={cn('grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-8', busy && 'opacity-60')}
            >
              {data?.items.map((nft, i) => <NftCard key={nft.id} nft={nft} priority={i < 3} />)}
            </div>
          )}

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onChange={(pagina) => {
                update({ pagina })
                document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
              }}
            />
          )}
        </div>
      </div>
    </section>
  )
}
