import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/contracts/api'
import { env } from '@/lib/env'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Transporte: somente WebSocket. O MSW intercepta WebSocket no navegador; long-polling
 * (o padrão do Socket.IO) não passaria pelo binding de mocks.
 */
export function createSocket(token: string | null): AppSocket {
  return io(env.socketUrl, {
    transports: ['websocket'],
    query: token ? { token } : {},
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3_000,
  })
}
