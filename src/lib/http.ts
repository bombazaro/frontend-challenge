import axios from 'axios'
import { env } from './env'
import { toApiError } from './api-error'
import { STORAGE_KEYS, storage } from './storage'

export const tokenStore = {
  get: () => storage.get(STORAGE_KEYS.token),
  set: (token: string) => storage.set(STORAGE_KEYS.token, token),
  clear: () => storage.remove(STORAGE_KEYS.token),
}

/** Carrinho do visitante: identificado por um id local até a autenticação. */
export const guestCartStore = {
  get(): string {
    let id = storage.get(STORAGE_KEYS.guestCartId)
    if (!id) {
      id = `guest_${crypto.randomUUID()}`
      storage.set(STORAGE_KEYS.guestCartId, id)
    }
    return id
  },
  rotate() {
    storage.remove(STORAGE_KEYS.guestCartId)
  },
}

type Listener = () => void
const sessionExpiredListeners = new Set<Listener>()

/** Notifica a aplicação quando a API rejeita o token (sessão expirada/inválida). */
export const sessionEvents = {
  onExpired(listener: Listener) {
    sessionExpiredListeners.add(listener)
    return () => sessionExpiredListeners.delete(listener)
  },
  emitExpired() {
    sessionExpiredListeners.forEach((l) => l())
  },
}

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set('X-Cart-Id', guestCartStore.get())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const sentToken = Boolean(error?.config?.headers?.Authorization)
    if (sentToken && apiError.isAuthError) sessionEvents.emitExpired()
    return Promise.reject(apiError)
  },
)
