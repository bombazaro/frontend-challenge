import type { FavoritesResponse } from '@/contracts/api'
import { http } from '@/lib/http'

export const favoritesApi = {
  list: (signal?: AbortSignal) => http.get<FavoritesResponse>('/favorites', { signal }).then((r) => r.data),
  add: (nftId: string) => http.post<FavoritesResponse>('/favorites', { nftId }).then((r) => r.data),
  remove: (nftId: string) => http.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
}
