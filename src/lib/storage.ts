/** Acesso seguro ao storage (modo privado/bloqueado não deve quebrar a aplicação). */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const storage = {
  get(key: string, area: Storage = localStorage) {
    return safe(() => area.getItem(key), null)
  },
  set(key: string, value: string, area: Storage = localStorage) {
    safe(() => area.setItem(key, value), undefined)
  },
  remove(key: string, area: Storage = localStorage) {
    safe(() => area.removeItem(key), undefined)
  },
  getJSON<T>(key: string, area: Storage = localStorage): T | null {
    const raw = storage.get(key, area)
    return raw ? safe(() => JSON.parse(raw) as T, null) : null
  },
  setJSON(key: string, value: unknown, area: Storage = localStorage) {
    storage.set(key, JSON.stringify(value), area)
  },
}

export const STORAGE_KEYS = {
  token: 'kurio:token',
  guestCartId: 'kurio:guest-cart-id',
  checkoutDraft: 'kurio:checkout-draft',
  checkoutAttempt: 'kurio:checkout-attempt',
  pendingOrder: 'kurio:pending-order',
} as const
