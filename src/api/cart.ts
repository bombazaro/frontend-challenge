import type { AddCartItemRequest, Cart, Network, Quote } from '@/contracts/api'
import { http } from '@/lib/http'

export const cartApi = {
  get: (signal?: AbortSignal) => http.get<Cart>('/cart', { signal }).then((r) => r.data),
  addItem: (body: AddCartItemRequest) => http.post<Cart>('/cart/items', body).then((r) => r.data),
  updateItem: (itemId: string, quantity: number) => http.patch<Cart>(`/cart/items/${itemId}`, { quantity }).then((r) => r.data),
  removeItem: (itemId: string) => http.delete<Cart>(`/cart/items/${itemId}`).then((r) => r.data),
  applyCoupon: (code: string) => http.put<Cart>('/cart/coupon', { code }).then((r) => r.data),
  removeCoupon: () => http.delete<Cart>('/cart/coupon').then((r) => r.data),
  acknowledge: () => http.post<Cart>('/cart/acknowledge').then((r) => r.data),
  merge: (guestCartId: string) => http.post<Cart>('/cart/merge', { guestCartId }).then((r) => r.data),
  quote: (network: Network, signal?: AbortSignal) => http.post<Quote>('/quote', { network }, { signal }).then((r) => r.data),
}
