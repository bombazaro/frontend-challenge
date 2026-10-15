import { QueryClient } from '@tanstack/react-query'
import { toApiError } from './api-error'

/**
 * Política de cache/retry (documentada no ARCHITECTURE.md):
 * - staleTime 30 s para leituras; dados privados usam chaves por usuário.
 * - retry apenas para falhas transitórias (rede, timeout, 5xx), no máximo 2 vezes com backoff exponencial.
 * - mutations não fazem retry automático (exceto a criação de pedido, que é idempotente).
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => toApiError(error).retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}
