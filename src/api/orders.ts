import type { CreateOrderRequest, Order } from '@/contracts/api'
import { http } from '@/lib/http'

/** Timeout menor que o padrão: o cenário de timeout é recuperado reenviando a MESMA chave de idempotência. */
export const ORDER_TIMEOUT_MS = 6_000

export const ordersApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    http
      .post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey }, timeout: ORDER_TIMEOUT_MS })
      .then((r) => r.data),
  get: (id: string, signal?: AbortSignal) => http.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),
}
