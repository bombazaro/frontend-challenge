import { HttpResponse, delay, http } from 'msw'
import Big from 'big.js'
import { CATEGORIES, NETWORKS, type CatalogFacets, type Category, type Network, type NftListResponse } from '@/contracts/api'
import { buildReviews, type NftRecord } from '../data/fixtures'
import { db } from '../db'
import { defaultEdition, findNft, toDetail, toSummary } from '../domain'
import { API, apiError, simulateNetwork } from '../http-utils'
import { isActive } from '../scenarios'

let outOfOrderSeq = 0

function priceOf(n: NftRecord) {
  return new Big(defaultEdition(n).price)
}

export const nftHandlers = [
  http.get(`${API}/nfts/featured`, async ({ request }) => {
    await simulateNetwork(request)
    return HttpResponse.json(db().nfts.filter((n) => n.featured).map(toSummary))
  }),

  http.get(`${API}/nfts`, async ({ request }) => {
    // Respostas fora de ordem: a 1ª requisição demora mais que as seguintes
    if (isActive('out-of-order')) await delay(outOfOrderSeq++ % 2 === 0 ? 1_800 : 200)
    await simulateNetwork(request)
    if (isActive('catalog-error')) return apiError(500, 'INTERNAL_ERROR', 'Não foi possível carregar o catálogo')

    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const categories = (url.searchParams.get('category') ?? '').split(',').filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c))
    const networks = (url.searchParams.get('network') ?? '').split(',').filter((c): c is Network => (NETWORKS as readonly string[]).includes(c))
    const min = url.searchParams.get('minPrice')
    const max = url.searchParams.get('maxPrice')
    const tab = url.searchParams.get('tab') ?? 'todos'
    const sort = url.searchParams.get('sort') ?? 'recentes'
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get('pageSize') ?? 9) || 9))

    let base = isActive('empty-catalog') ? [] : [...db().nfts]
    if (q) base = base.filter((n) => `${n.name} ${n.collection} ${n.attributes.join(' ')}`.toLowerCase().includes(q))
    if (tab === 'novos') base = base.filter((_, i) => i < 18)
    if (tab === 'em-alta') base = base.filter((n) => n.popularity >= 400)
    const byPrice = (n: NftRecord) => (!min || priceOf(n).gte(min)) && (!max || priceOf(n).lte(max))
    const byCategory = (n: NftRecord) => !categories.length || categories.includes(n.category)
    const byNetwork = (n: NftRecord) => !networks.length || networks.includes(n.network)

    // Facetas: cada contagem considera os demais filtros (padrão de e-commerce)
    const facets: CatalogFacets = {
      categories: Object.fromEntries(CATEGORIES.map((c) => [c, base.filter((n) => n.category === c && byNetwork(n) && byPrice(n)).length])) as Record<Category, number>,
      networks: Object.fromEntries(NETWORKS.map((nw) => [nw, base.filter((n) => n.network === nw && byCategory(n) && byPrice(n)).length])) as Record<Network, number>,
      priceRange: db().nfts.reduce(
        (acc, n) => ({
          min: priceOf(n).lt(acc.min) ? defaultEdition(n).price : acc.min,
          max: priceOf(n).gt(acc.max) ? defaultEdition(n).price : acc.max,
        }),
        { min: '999999', max: '0' },
      ),
    }

    const filtered = base.filter((n) => byCategory(n) && byNetwork(n) && byPrice(n))
    filtered.sort((a, b) => {
      switch (sort) {
        case 'menor-preco':
          return priceOf(a).cmp(priceOf(b)) || a.id.localeCompare(b.id)
        case 'maior-preco':
          return priceOf(b).cmp(priceOf(a)) || a.id.localeCompare(b.id)
        case 'populares':
          return b.popularity - a.popularity || a.id.localeCompare(b.id)
        default:
          return b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id)
      }
    })

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary)
    return HttpResponse.json<NftListResponse>({ items, page, pageSize, total, totalPages, facets })
  }),

  http.get(`${API}/nfts/:id`, async ({ request, params }) => {
    await simulateNetwork(request)
    const nft = findNft(String(params.id))
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    return HttpResponse.json(toDetail(nft))
  }),

  http.get(`${API}/nfts/:id/reviews`, async ({ request, params }) => {
    await simulateNetwork(request)
    const nft = findNft(String(params.id))
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    return HttpResponse.json(buildReviews(nft.id, nft.reviewsCount))
  }),
]
