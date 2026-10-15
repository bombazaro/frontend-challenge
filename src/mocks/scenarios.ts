/**
 * Cenários determinísticos da simulação. Ativados por:
 *  - URL: ?scenario=slow,payment-refused (persistido)
 *  - painel "Mocks" na aplicação
 *  - testes: window.__kurioMock.setScenarios([...]) ou localStorage 'kurio:mock-scenarios'
 */
export const SCENARIOS = {
  slow: 'Latência alta (2,5 s em todas as respostas)',
  'variable-latency': 'Latência variável (sequência fixa 100 ms – 2 s)',
  'out-of-order': 'Respostas do catálogo fora de ordem',
  offline: 'Sem conexão (todas as requisições REST falham)',
  'catalog-error': 'Catálogo responde HTTP 500',
  flaky: 'Primeira leitura de cada recurso falha com 503',
  'empty-catalog': 'Catálogo sem resultados',
  'favorites-error': 'Favoritar/desfavoritar falha com 500',
  'price-change-at-checkout': 'Preço muda ao confirmar a compra (1ª tentativa)',
  'soldout-at-checkout': 'Edição esgota ao confirmar a compra (1ª tentativa)',
  'order-timeout': 'Pedido criado, mas a resposta excede o timeout (1ª tentativa)',
  'payment-refused': 'Pagamento recusado na liquidação',
  'manual-settlement': 'Pedidos ficam pendentes até liquidação manual',
  'wallet-rejected': 'Carteira recusa a conexão',
  'realtime-offline': 'Servidor Socket.IO indisponível',
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mock-scenarios'
const active = new Set<ScenarioName>()
/** Gatilhos de "primeira vez" já disparados (resetados ao trocar cenários) */
const fired = new Set<string>()

function isScenario(value: string): value is ScenarioName {
  return value in SCENARIOS
}

export function loadScenarios() {
  active.clear()
  try {
    const fromUrl = new URLSearchParams(location.search).get('scenario')
    const raw = fromUrl ?? localStorage.getItem(STORAGE_KEY) ?? ''
    raw.split(',').map((s) => s.trim()).filter(isScenario).forEach((s) => active.add(s))
    if (fromUrl !== null) localStorage.setItem(STORAGE_KEY, [...active].join(','))
  } catch {
    // storage indisponível: sem cenários
  }
}

export function setScenarios(names: string[]) {
  active.clear()
  fired.clear()
  names.filter(isScenario).forEach((s) => active.add(s))
  try {
    localStorage.setItem(STORAGE_KEY, [...active].join(','))
  } catch {
    // ignore
  }
}

export function getScenarios(): ScenarioName[] {
  return [...active]
}

export function isActive(name: ScenarioName) {
  return active.has(name)
}

/** true apenas na primeira chamada para a chave enquanto o cenário estiver ativo */
export function once(name: ScenarioName, key = ''): boolean {
  if (!active.has(name)) return false
  const id = `${name}:${key}`
  if (fired.has(id)) return false
  fired.add(id)
  return true
}

export const mockConfig = {
  /** Tempo até um pedido pendente ser liquidado */
  settleDelayMs: 2_500,
  /** Latência padrão (ms) */
  baseLatencyMs: 200,
}
