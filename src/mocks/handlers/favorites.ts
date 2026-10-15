import { HttpResponse, http } from 'msw'
import type { FavoritesResponse } from '@/contracts/api'
import { db, persist } from '../db'
import { findNft } from '../domain'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { isActive } from '../scenarios'

export const favoriteHandlers = [
  http.get(`${API}/favorites`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    return HttpResponse.json<FavoritesResponse>({ nftIds: db().favorites[user.id] ?? [] })
  }),

  http.post(`${API}/favorites`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    if (isActive('favorites-error')) return apiError(500, 'INTERNAL_ERROR', 'Não foi possível salvar o favorito')
    const { nftId } = await readJson<{ nftId: string }>(request)
    if (!findNft(nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    const list = (db().favorites[user.id] ??= [])
    if (!list.includes(nftId)) list.push(nftId)
    persist()
    return HttpResponse.json<FavoritesResponse>({ nftIds: list }, { status: 201 })
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    if (isActive('favorites-error')) return apiError(500, 'INTERNAL_ERROR', 'Não foi possível remover o favorito')
    db().favorites[user.id] = (db().favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    persist()
    return HttpResponse.json<FavoritesResponse>({ nftIds: db().favorites[user.id] })
  }),
]
