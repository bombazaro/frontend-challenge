import type { QueryClient } from '@tanstack/react-query'
import type { Cart, Nft, NftListResponse, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/contracts/api'
import { qk } from '@/api/keys'

function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.data.nftId || event.version <= item.version) return item
  return { ...item, price: event.data.price, soldOut: event.data.soldOut, version: event.version }
}

/** Aplica `nft.updated` no catálogo, destaques e detalhe. Retorna true se o NFT está no carrinho. */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): boolean {
  const { nftId } = event.data

  queryClient.setQueryData<Nft>(qk.nfts.detail(nftId), (old) => {
    if (!old || event.version <= old.version) return old
    const byId = new Map(event.data.editions.map((e) => [e.id, e]))
    return {
      ...patchSummary(old, event),
      editions: old.editions.map((e) => ({ ...e, ...(byId.get(e.id) ?? {}) })),
    }
  })

  queryClient.setQueriesData<NftListResponse>({ queryKey: qk.nfts.lists }, (old) =>
    old ? { ...old, items: old.items.map((i) => patchSummary(i, event)) } : old,
  )
  queryClient.setQueriesData<NftSummary[]>({ queryKey: qk.nfts.featured }, (old) => old?.map((i) => patchSummary(i, event)))

  // Carrinho e cotação: valores oficiais vêm do servidor -> reconciliação via REST
  const inCart = queryClient
    .getQueriesData<Cart>({ queryKey: ['cart'] })
    .some(([, cart]) => cart?.items.some((i) => i.nftId === nftId))
  if (inCart) {
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    queryClient.invalidateQueries({ queryKey: ['quote'] })
  }
  return inCart
}

/** Aplica `order.updated`. Estados terminais nunca regridem. */
export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string): boolean {
  if (event.data.userId !== userId) return false
  let applied = false
  queryClient.setQueryData<Order>(qk.order(userId, event.data.orderId), (old) => {
    if (!old || old.status !== 'pending' || event.version <= old.version) return old
    applied = true
    return { ...old, status: event.data.status, txHash: event.data.txHash, failureReason: event.data.failureReason, version: event.version }
  })
  // Busca o recibo completo (explorerUrl etc.) e sincroniza carrinho/estoque
  queryClient.invalidateQueries({ queryKey: qk.order(userId, event.data.orderId) })
  if (event.data.status === 'confirmed') {
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    queryClient.invalidateQueries({ queryKey: ['quote'] })
  }
  return applied
}
