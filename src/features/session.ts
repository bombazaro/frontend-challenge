import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/contracts/api'
import { authApi, sessionQueryOptions } from '@/api/session'
import { cartApi } from '@/api/cart'
import { qk } from '@/api/keys'
import { guestCartStore, tokenStore } from '@/lib/http'
import { STORAGE_KEYS, storage } from '@/lib/storage'

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  const session = query.data ?? null
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    isReady: !query.isPending,
  }
}

/** Remove do cache tudo que pertence à sessão anterior (isolamento entre usuários). */
export function clearPrivateData(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['user'] })
  queryClient.removeQueries({ queryKey: ['cart'] })
  queryClient.removeQueries({ queryKey: ['quote'] })
  storage.remove(STORAGE_KEYS.checkoutAttempt, sessionStorage)
  storage.remove(STORAGE_KEYS.pendingOrder)
}

async function completeAuth(queryClient: QueryClient, response: AuthResponse) {
  clearPrivateData(queryClient)
  tokenStore.set(response.token)
  // Mescla o carrinho do visitante ANTES de publicar a sessão no cache:
  // assim nenhuma consulta do carrinho do usuário é feita com dados anteriores à mesclagem.
  try {
    await cartApi.merge(guestCartStore.get())
    guestCartStore.rotate()
  } catch {
    // falha na mesclagem não impede o login; o carrinho do visitante permanece no servidor
  }
  queryClient.setQueryData(qk.session, response.session)
  await queryClient.invalidateQueries({ queryKey: ['cart'] })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (response) => completeAuth(queryClient, response),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (response) => completeAuth(queryClient, response),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        // logout local continua mesmo se a API falhar
      }
    },
    onSettled: () => {
      tokenStore.clear()
      clearPrivateData(queryClient)
      storage.remove(STORAGE_KEYS.checkoutDraft, sessionStorage)
      queryClient.setQueryData(qk.session, null)
    },
  })
}

/** Expiração detectada pela API: limpa a sessão local preservando o carrinho do servidor. */
export function expireSession(queryClient: QueryClient) {
  tokenStore.clear()
  clearPrivateData(queryClient)
  queryClient.setQueryData(qk.session, null)
}
