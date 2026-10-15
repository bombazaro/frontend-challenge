import { queryOptions } from '@tanstack/react-query'
import type { AuthResponse, LoginRequest, RegisterRequest, Session } from '@/contracts/api'
import { http, tokenStore } from '@/lib/http'
import { toApiError } from '@/lib/api-error'
import { qk } from './keys'

export const authApi = {
  login: (body: LoginRequest) => http.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) => http.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  logout: () => http.post<void>('/auth/logout').then(() => undefined),
  session: (signal?: AbortSignal) => http.get<Session>('/auth/session', { signal }).then((r) => r.data),
}

/** Sessão recuperável após refresh: o token fica no storage e é validado na API. */
export const sessionQueryOptions = queryOptions({
  queryKey: qk.session,
  queryFn: async ({ signal }): Promise<Session | null> => {
    if (!tokenStore.get()) return null
    try {
      return await authApi.session(signal)
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.isAuthError) {
        tokenStore.clear()
        return null
      }
      throw apiError
    }
  },
  staleTime: 5 * 60_000,
  retry: (count, error) => toApiError(error).retryable && count < 2,
})
