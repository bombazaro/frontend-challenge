import type { Network, UpsertWalletRequest, Wallet, WalletConnection } from '@/contracts/api'
import { http } from '@/lib/http'

export const walletsApi = {
  list: (signal?: AbortSignal) => http.get<Wallet[]>('/wallets', { signal }).then((r) => r.data),
  create: (body: UpsertWalletRequest) => http.post<Wallet>('/wallets', body).then((r) => r.data),
  update: (id: string, body: UpsertWalletRequest) => http.put<Wallet>(`/wallets/${id}`, body).then((r) => r.data),
  connect: (id: string, network: Network) => http.post<WalletConnection>(`/wallets/${id}/connect`, { network }).then((r) => r.data),
  disconnect: (id: string) => http.post<void>(`/wallets/${id}/disconnect`).then(() => undefined),
}
