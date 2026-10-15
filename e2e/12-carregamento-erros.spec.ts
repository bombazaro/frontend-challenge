import { NFT, expect, test } from './fixtures'

test.describe('Skeletons, falhas e recuperação', () => {
  test('skeletons durante carregamento lento', async ({ app, page }) => {
    await page.goto('/?scenario=slow')
    await expect(page.getByTestId('nft-card-skeleton').first()).toBeVisible()
    await expect(page.getByTestId('nft-card')).toHaveCount(9, { timeout: 15_000 })

    await page.goto(`/nft/${NFT.emerald}`)
    await expect(page.getByTestId('nft-detail-skeleton')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 15_000 })

    await app.setScenarios([])
    await app.addToCart(NFT.emerald)
    await app.setScenarios(['slow'])
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-skeleton').or(page.getByTestId('quote-skeleton')).first()).toBeVisible()
    await expect(page.getByTestId('quote-summary')).toBeVisible({ timeout: 15_000 })
  })

  test('falha do catálogo com feedback e nova tentativa', async ({ app, page }) => {
    await app.goto('/', ['catalog-error'])
    await expect(page.getByRole('alert').getByText('Não foi possível carregar o catálogo').first()).toBeVisible({ timeout: 15_000 })
    await app.setScenarios([])
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })

  test('falha transitória é recuperada por retry automático', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.sage}`, ['flaky'])
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible({ timeout: 15_000 })
  })

  test('sem conexão mostra erro e recupera', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await app.setScenarios(['offline'])
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page.getByText('Sem conexão com o servidor. Verifique sua internet.')).toBeVisible({ timeout: 15_000 })
    await app.setScenarios([])
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })
})
