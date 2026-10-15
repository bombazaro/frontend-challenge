import { NFT, expect, test } from './fixtures'

/** Regressão visual com dados estáveis (fixtures determinísticas, sem animações, relógio fixo). */
test.describe('Regressão visual @principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-07-29T12:00:00-03:00'))
  })

  const settle = async (page: import('@playwright/test').Page) => {
    await page.evaluate(() => document.fonts.ready)
    await page.waitForLoadState('networkidle')
    await page.evaluate(async () => {
      await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((r) => (img.onload = img.onerror = r))))
    })
  }

  test('início', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.emerald}`)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ app, page }) => {
    await app.addToCart(NFT.emerald, 2)
    await app.addToCart(NFT.sage, 1)
    await app.goto('/carrinho')
    await expect(page.getByTestId('quote-summary')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ app, page }) => {
    await app.prepareCheckout()
    await expect(page.getByTestId('quote-summary')).toBeVisible()
    // Aguarda os toasts sumirem para a captura ficar estável
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
