import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { initDb, resetDb } from './db'
import { resumePendingOrders } from './domain'
import { loadScenarios, setScenarios } from './scenarios'
import { mockControl } from './control'

export const worker = setupWorker(...handlers)

/** Inicializa o servidor simulado. Deve terminar ANTES de carregar o socket.io-client. */
export async function startMocks() {
  const params = new URLSearchParams(location.search)
  if (params.has('mock-reset')) {
    await resetDb()
    setScenarios([])
  } else {
    await initDb()
  }
  loadScenarios()
  resumePendingOrders()
  window.__kurioMock = mockControl
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
