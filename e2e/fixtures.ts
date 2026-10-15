import { test as base, expect, type Page } from '@playwright/test'

export const USERS = {
  marina: { email: 'marina@kurio.dev', password: 'Kurio@2026', name: 'Marina Costa' },
  rafael: { email: 'rafael@kurio.dev', password: 'Kurio@2026', name: 'Rafael Lima' },
} as const

export const NFT = { emerald: 'emerald-ape-042', sage: 'sage-nomad-009', soldOut: 'copper-drifter-' } as const

type MockFn = (mock: NonNullable<Window['__kurioMock']>, arg: unknown) => unknown

export class App {
  constructor(readonly page: Page) {}

  /** Abre a aplicação já com cenários ativos (?scenario=...) */
  async goto(path = '/', scenarios: string[] = []) {
    const url = new URL(path, 'http://x')
    if (scenarios.length) url.searchParams.set('scenario', scenarios.join(','))
    await this.page.goto(`${url.pathname}${url.search}${url.hash}`)
    await this.page.waitForFunction(() => Boolean(window.__kurioMock))
    await this.page.locator('#conteudo').waitFor({ state: 'attached' })
  }

  /** Executa uma ação no servidor simulado (REST + Socket.IO refletem a mudança) */
  async mock<T = unknown>(fn: MockFn, arg?: unknown): Promise<T> {
    return (await this.page.evaluate(([src, a]) => {
      const f = new Function(`return (${src})`)() as MockFn
      return f(window.__kurioMock!, a)
    }, [fn.toString(), arg] as const)) as T
  }

  async setScenarios(names: string[]) {
    await this.mock((m, n) => m.setScenarios(n as string[]), names)
  }

  async waitForRealtime() {
    await expect.poll(() => this.mock((m) => m.connectedClients().length)).toBeGreaterThan(0)
  }

  async login(user: keyof typeof USERS = 'marina', from = '/entrar') {
    const u = USERS[user]
    if (!this.page.url().includes('/entrar')) await this.goto(from)
    await this.page.getByPlaceholder('contato@email.com').fill(u.email)
    await this.page.getByPlaceholder('Senha').fill(u.password)
    await this.page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(this.page.getByRole('dialog')).toBeHidden()
  }

  async addToCart(nftId: string, quantity = 1) {
    await this.goto(`/nft/${nftId}`)
    const increase = this.page.getByRole('button', { name: /Aumentar quantidade/ })
    for (let i = 1; i < quantity; i++) await increase.click()
    await this.page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(this.page.getByText(/adicionado ao carrinho/).first()).toBeVisible()
  }

  /** Prepara o checkout: carrinho com item, login e carteira conectada */
  async prepareCheckout(opts: { nftId?: string; quantity?: number } = {}) {
    await this.goto('/entrar')
    await this.login('marina')
    await this.addToCart(opts.nftId ?? NFT.emerald, opts.quantity ?? 1)
    await this.goto('/pagamento')
    await this.page.getByLabel('Código de indicação').fill('KURIO')
    await this.page.getByRole('button', { name: /Conectar na/ }).click()
    await expect(this.page.getByTestId('wallet-primary').getByText('Conectada', { exact: true })).toBeVisible()
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    // Esconde o painel de mocks (estável para screenshots) e reduz animações
    await page.addInitScript(() => localStorage.setItem('kurio:mock-panel', 'hidden'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await use(new App(page))
  },
})

export { expect }
