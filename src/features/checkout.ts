import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderRequest, Order, Quote } from '@/contracts/api'
import { ordersApi } from '@/api/orders'
import { qk } from '@/api/keys'
import { toApiError } from '@/lib/api-error'
import { STORAGE_KEYS, storage } from '@/lib/storage'
import { useSession } from './session'

interface Attempt {
  signature: string
  key: string
}

/**
 * Chave de idempotência por tentativa: o MESMO payload reutiliza a MESMA chave
 * (cliques repetidos, retry após timeout, refresh). Payload diferente => nova chave.
 */
export function idempotencyKeyFor(body: CreateOrderRequest) {
  const signature = JSON.stringify(body)
  const current = storage.getJSON<Attempt>(STORAGE_KEYS.checkoutAttempt, sessionStorage)
  if (current?.signature === signature) return current.key
  const key = `idem_${crypto.randomUUID()}`
  storage.setJSON(STORAGE_KEYS.checkoutAttempt, { signature, key }, sessionStorage)
  return key
}

export function clearCheckoutAttempt() {
  storage.remove(STORAGE_KEYS.checkoutAttempt, sessionStorage)
}

export interface PendingOrderRef {
  orderId: string
  userId: string
}

export function getPendingOrder(userId: string) {
  const ref = storage.getJSON<PendingOrderRef>(STORAGE_KEYS.pendingOrder)
  return ref?.userId === userId ? ref : null
}

export function clearPendingOrder() {
  storage.remove(STORAGE_KEYS.pendingOrder)
}

/** Assinatura de valores: só exige nova confirmação se algum valor realmente mudou. */
export function quoteSignature(q: Quote) {
  return JSON.stringify([q.network, q.subtotal, q.discount, q.networkFee, q.total, q.lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice])])
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationKey: ['create-order'],
    mutationFn: (body: CreateOrderRequest) => ordersApi.create(body, idempotencyKeyFor(body)),
    // Retry seguro: a chave de idempotência garante que o servidor devolva o mesmo pedido
    retry: (count, error) => {
      const e = toApiError(error)
      return (e.code === 'TIMEOUT' || e.code === 'NETWORK_ERROR' || e.status >= 500) && count < 3
    },
    retryDelay: 1_000,
    onSuccess: (order: Order) => {
      if (!user) return
      storage.setJSON(STORAGE_KEYS.pendingOrder, { orderId: order.id, userId: user.id } satisfies PendingOrderRef)
      queryClient.setQueryData(qk.order(user.id, order.id), order)
    },
    onError: (error) => {
      if (toApiError(error).code === 'QUOTE_STALE') {
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        queryClient.invalidateQueries({ queryKey: ['quote'] })
        queryClient.invalidateQueries({ queryKey: ['nfts'] })
      }
    },
  })
}
