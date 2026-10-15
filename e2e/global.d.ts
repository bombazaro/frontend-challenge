/* Tipagem mínima da API de controle dos mocks exposta pela aplicação (src/mocks/control.ts) */
export {}

interface MockNft {
  id: string
  version: number
  defaultEditionId: string
  editions: Array<{ id: string; price: string; available: number }>
}

declare global {
  interface Window {
    __kurioMock?: {
      setScenarios(names: string[]): void
      getScenarios(): string[]
      reset(): Promise<void>
      updateNft(id: string, change: { price?: string; editionId?: string; available?: number }): unknown
      emitDuplicateNftEvent(id: string): unknown
      emitStaleNftEvent(id: string, price?: string): unknown
      settleOrder(id: string, status: 'confirmed' | 'refused', reason?: string): unknown
      dropRealtime(): void
      connectedClients(): Array<{ id: number; userId: string | null }>
      expireSessions(): void
      orders(): Array<{ id: string; status: string; idempotencyKey: string; userId: string }>
      nfts(): MockNft[]
      config: { settleDelayMs: number; baseLatencyMs: number }
    }
  }
}
