import { env } from './lib/env'

/**
 * Os mocks precisam estar ativos antes de importar a aplicação: o socket.io-client captura
 * o construtor de WebSocket no carregamento do módulo, e o MSW precisa interceptá-lo.
 */
async function enableMocking() {
  if (!env.enableMocks) return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
}

enableMocking().then(async () => {
  const { bootstrap } = await import('./bootstrap')
  bootstrap()
})
