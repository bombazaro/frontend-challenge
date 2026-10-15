import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemRequest, Cart, Network } from '@/contracts/api'
import { cartApi } from '@/api/cart'
import { qk } from '@/api/keys'
import { guestCartStore } from '@/lib/http'
import { useSession } from './session'

/** Dono do carrinho: usuário autenticado ou visitante (id local). */
export function useCartOwner() {
  const { user, isReady } = useSession()
  const owner = user ? `user:${user.id}` : `guest:${guestCartStore.get()}`
  return { owner, isReady }
}

export function useCart() {
  const { owner, isReady } = useCartOwner()
  return useQuery({
    queryKey: qk.cart(owner),
    queryFn: ({ signal }) => cartApi.get(signal),
    enabled: isReady,
    staleTime: 10_000,
  })
}

function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const { owner } = useCartOwner()
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      queryClient.setQueryData(qk.cart(owner), cart)
      queryClient.invalidateQueries({ queryKey: qk.quotes(owner) })
    },
  })
}

export const useAddToCart = () => useCartMutation((body: AddCartItemRequest) => cartApi.addItem(body))
export const useUpdateCartItem = () => useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, quantity))
export const useRemoveCartItem = () => useCartMutation((itemId: string) => cartApi.removeItem(itemId))
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation((_: void) => cartApi.removeCoupon())
export const useAcknowledgeCart = () => useCartMutation((_: void) => cartApi.acknowledge())

/** Cotação do servidor: referência oficial de valores. A revisão do carrinho faz parte da chave. */
export function useQuote(network: Network, opts: { enabled?: boolean } = {}) {
  const { owner } = useCartOwner()
  const cart = useCart()
  const revision = cart.data?.revision ?? 0
  return useQuery({
    queryKey: qk.quote(owner, network, revision),
    queryFn: ({ signal }) => cartApi.quote(network, signal),
    enabled: (opts.enabled ?? true) && Boolean(cart.data && cart.data.items.length > 0),
    staleTime: 0,
  })
}
