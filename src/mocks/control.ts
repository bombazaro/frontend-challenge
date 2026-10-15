import { db, resetDb } from './db'
import { findNft, settleOrder, updateNft } from './domain'
import { buildNftEvent, connectedClients, dropAllConnections, emitRaw } from './realtime'
import { SCENARIOS, getScenarios, mockConfig, setScenarios } from './scenarios'

/**
 * API de controle do servidor simulado, exposta em `window.__kurioMock`.
 * Usada pelo painel de mocks e pelos testes Playwright. Tudo que ela altera passa pelo
 * "servidor": as respostas REST e os eventos Socket.IO refletem a mudança.
 */
export const mockControl = {
  scenarios: SCENARIOS,
  getScenarios,
  setScenarios,
  config: mockConfig,
  async reset() {
    await resetDb()
    setScenarios([])
    dropAllConnections()
  },
  /** Altera preço/disponibilidade de um NFT e emite `nft.updated` */
  updateNft,
  /** Reenvia o último evento do NFT (duplicata) */
  emitDuplicateNftEvent(nftId: string) {
    const nft = findNft(nftId)
    if (!nft) throw new Error('NFT inexistente')
    const event = buildNftEvent(nft)
    emitRaw(event)
    emitRaw(event)
    return event
  },
  /** Emite um evento com versão antiga e preço diferente (não deve ser aplicado) */
  emitStaleNftEvent(nftId: string, price = '0.01') {
    const nft = findNft(nftId)
    if (!nft) throw new Error('NFT inexistente')
    const event = buildNftEvent(nft, nft.version - 1)
    event.data.price = price
    event.data.editions = event.data.editions.map((e) => ({ ...e, price }))
    emitRaw(event)
    return event
  },
  settleOrder,
  dropRealtime: dropAllConnections,
  connectedClients,
  /** Expira todas as sessões ativas (próxima chamada autenticada recebe 401 SESSION_EXPIRED) */
  expireSessions() {
    db().sessions.forEach((s) => (s.expiresAt = new Date(Date.now() - 1000).toISOString()))
  },
  orders: () => Object.values(db().orders),
  nfts: () => db().nfts,
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
