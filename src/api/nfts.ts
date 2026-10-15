import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { Nft, NftListParams, NftListResponse, NftReview, NftSummary } from '@/contracts/api'
import type { CatalogSearch } from '@/contracts/schemas'
import { http } from '@/lib/http'
import { qk } from './keys'

export const PAGE_SIZE = 9

export const nftsApi = {
  list: (params: NftListParams, signal?: AbortSignal) =>
    http
      .get<NftListResponse>('/nfts', {
        signal,
        params: {
          q: params.q || undefined,
          category: params.category?.join(',') || undefined,
          network: params.network?.join(',') || undefined,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          tab: params.tab,
          sort: params.sort,
          page: params.page,
          pageSize: params.pageSize,
        },
      })
      .then((r) => r.data),
  featured: (signal?: AbortSignal) => http.get<NftSummary[]>('/nfts/featured', { signal }).then((r) => r.data),
  detail: (id: string, signal?: AbortSignal) => http.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal }).then((r) => r.data),
  reviews: (id: string, signal?: AbortSignal) =>
    http.get<NftReview[]>(`/nfts/${encodeURIComponent(id)}/reviews`, { signal }).then((r) => r.data),
}

/** Estado da URL -> parâmetros da API (contrato único entre rota e consulta). */
export function searchToParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    category: search.categoria,
    network: search.rede,
    minPrice: search.min !== undefined ? String(search.min) : undefined,
    maxPrice: search.max !== undefined ? String(search.max) : undefined,
    tab: search.aba ?? 'todos',
    sort: search.ordem ?? 'recentes',
    page: search.pagina ?? 1,
    pageSize: PAGE_SIZE,
  }
}

export const nftListQueryOptions = (params: NftListParams) =>
  queryOptions({
    queryKey: qk.nfts.list(params),
    // O signal cancela a requisição quando os parâmetros mudam (respostas obsoletas são descartadas)
    queryFn: ({ signal }) => nftsApi.list(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const featuredQueryOptions = queryOptions({
  queryKey: qk.nfts.featured,
  queryFn: ({ signal }) => nftsApi.featured(signal),
  staleTime: 60_000,
})

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: ({ signal }) => nftsApi.detail(id, signal),
    staleTime: 30_000,
  })

export const nftReviewsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.reviews(id),
    queryFn: ({ signal }) => nftsApi.reviews(id, signal),
    staleTime: 5 * 60_000,
  })
