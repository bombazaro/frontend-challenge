import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/api'
import { db, nowIso, persist } from './db'
import { isActive } from './scenarios'
import type { NftRecord } from './data/fixtures'
import type { OrderRecord } from './db'

/**
 * Servidor Socket.IO simulado.
 * O MSW intercepta o WebSocket aberto pelo socket.io-client e o @mswjs/socket.io-binding
 * codifica/decodifica os pacotes Engine.IO/Socket.IO. Os eventos saem SEMPRE por aqui.
 */
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock').replace(/\/$/, '')

interface Client {
  id: number
  userId: string | null
  io: ReturnType<typeof toSocketIo>
  close: () => void
}

const clients = new Map<number, Client>()
let clientSeq = 0

// O MSW remove o prefixo /socket.io/ do caminho antes de comparar: o link usa apenas a origem.
const realtime = ws.link(SOCKET_URL)

function userFromUrl(url: URL) {
  const token = url.searchParams.get('token')
  if (!token) return null
  const session = db().sessions.find((s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now())
  return session?.userId ?? null
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    if (isActive('realtime-offline')) {
      connection.client.close()
      return
    }
    const io = toSocketIo(connection)
    const id = ++clientSeq
    // Heartbeat Engine.IO ("2" = ping). Sem ele o cliente encerraria a conexão após pingInterval + pingTimeout.
    const heartbeat = setInterval(() => connection.client.send('2'), 20_000)
    const client: Client = {
      id,
      userId: userFromUrl(new URL(connection.client.url)),
      io,
      close: () => connection.client.close(),
    }
    clients.set(id, client)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      clients.delete(id)
    })
  }),
]

function nextEventId() {
  const s = db()
  s.eventSeq += 1
  persist()
  return `evt_${s.eventSeq.toString().padStart(6, '0')}`
}

export function buildNftEvent(nft: NftRecord, version = nft.version): NftUpdatedEvent {
  const def = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]
  return {
    eventId: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version,
    occurredAt: nowIso(),
    data: {
      nftId: nft.id,
      name: nft.name,
      price: def.price,
      soldOut: nft.editions.every((e) => e.available === 0),
      editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available })),
    },
  }
}

export function emitNftUpdated(event: NftUpdatedEvent) {
  // Evento público: todos os clientes conectados
  clients.forEach((c) => c.io.client.emit('nft.updated', event))
}

export function emitOrderUpdated(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    data: {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      txHash: order.txHash,
      failureReason: order.failureReason,
    },
  }
  // Evento privado: somente sockets autenticados do dono do pedido
  clients.forEach((c) => {
    if (c.userId === order.userId) c.io.client.emit('order.updated', event)
  })
  return event
}

/** Re-emite um evento já enviado (teste de duplicatas). */
export function emitRaw(event: NftUpdatedEvent) {
  emitNftUpdated(event)
}

export function dropAllConnections() {
  clients.forEach((c) => c.close())
  clients.clear()
}

export function connectedClients() {
  return [...clients.values()].map((c) => ({ id: c.id, userId: c.userId }))
}
