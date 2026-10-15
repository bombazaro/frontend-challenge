import { HttpResponse, http } from 'msw'
import { NETWORKS, type Network, type UpsertWalletRequest, type Wallet } from '@/contracts/api'
import { toFieldErrors, upsertWalletRequestSchema } from '@/contracts/schemas'
import { db, nextId, nowIso, persist, type WalletRecord } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { isActive } from '../scenarios'

function strip(w: WalletRecord): Wallet {
  const { userId: _u, ...rest } = w
  return { ...rest, connectedNetwork: db().connections[w.id]?.network ?? null }
}

async function parseWallet(request: Request, selfId?: string) {
  const parsed = upsertWalletRequestSchema.safeParse(await readJson<UpsertWalletRequest>(request))
  if (!parsed.success) throw apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados', { fieldErrors: toFieldErrors(parsed.error) })
  const taken = db().wallets.some((w) => w.id !== selfId && w.address.toLowerCase() === parsed.data.address.toLowerCase())
  if (taken) throw apiError(409, 'ADDRESS_TAKEN', 'Este endereço já está cadastrado', { fieldErrors: { address: 'Este endereço já está cadastrado' } })
  return parsed.data
}

export const walletHandlers = [
  http.get(`${API}/wallets`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const list = db().wallets.filter((w) => w.userId === user.id).sort((a, b) => a.role.localeCompare(b.role))
    return HttpResponse.json(list.map(strip))
  }),

  http.post(`${API}/wallets`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const data = await parseWallet(request)
    if (db().wallets.some((w) => w.userId === user.id && w.role === data.role)) {
      return apiError(409, 'VALIDATION_ERROR', 'Já existe uma carteira com este papel. Edite a existente.')
    }
    const now = nowIso()
    const wallet: WalletRecord = { ...data, id: nextId('wal'), userId: user.id, connectedNetwork: null, createdAt: now, updatedAt: now }
    db().wallets.push(wallet)
    persist()
    return HttpResponse.json(strip(wallet), { status: 201 })
  }),

  http.put(`${API}/wallets/:id`, async ({ request, params }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const wallet = db().wallets.find((w) => w.id === params.id)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada')
    if (wallet.userId !== user.id) return apiError(403, 'FORBIDDEN', 'Sem permissão para editar esta carteira')
    const data = await parseWallet(request, wallet.id)
    Object.assign(wallet, data, { role: wallet.role, updatedAt: nowIso() })
    delete db().connections[wallet.id]
    persist()
    return HttpResponse.json(strip(wallet))
  }),

  http.post(`${API}/wallets/:id/connect`, async ({ request, params }) => {
    await simulateNetwork(request, { latencyMs: 700 })
    const user = requireUser(request)
    const wallet = db().wallets.find((w) => w.id === params.id && w.userId === user.id)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada')
    const { network } = await readJson<{ network: Network }>(request)
    if (!NETWORKS.includes(network)) return apiError(422, 'VALIDATION_ERROR', 'Rede inválida')
    if (isActive('wallet-rejected')) return apiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    const connection = { walletId: wallet.id, network, status: 'connected' as const, connectedAt: nowIso(), userId: user.id }
    db().connections[wallet.id] = connection
    persist()
    const { userId: _u, ...pub } = connection
    return HttpResponse.json(pub)
  }),

  http.post(`${API}/wallets/:id/disconnect`, async ({ request, params }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const conn = db().connections[String(params.id)]
    if (conn && conn.userId === user.id) delete db().connections[String(params.id)]
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]
