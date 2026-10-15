import { NFT, expect, test } from './fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto, edição indisponível e limite de quantidade @principal', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.emerald}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByTestId('nft-price')).toContainText('1.19 ETH')

    // Edição 1/1 esgotada
    await expect(page.getByRole('radio', { name: '1/1 (esgotada)' })).toBeDisabled()

    // Limite por pedido da edição 1/50 = 10
    const increase = page.getByRole('button', { name: /Aumentar quantidade/ })
    for (let i = 0; i < 12; i++) if (await increase.isEnabled()) await increase.click()
    await expect(page.getByLabel('Quantidade: 10')).toBeVisible()
    await expect(increase).toBeDisabled()

    // Trocar edição atualiza preço e reinicia quantidade
    await page.getByText('ABERTA', { exact: true }).click()
    await expect(page.getByTestId('nft-price')).toContainText('0.60 ETH')
    await expect(page.getByLabel('Quantidade: 1')).toBeVisible()
  })

  test('NFT inexistente e rota inexistente', async ({ app, page }) => {
    await app.goto('/nft/nao-existe-123')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await app.goto('/rota/que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('NFT totalmente esgotado não permite compra', async ({ app, page }) => {
    await app.goto('/')
    const soldOut = await app.mock((m) => m.nfts().find((n) => n.editions.every((e) => e.available === 0))!.id)
    await app.goto(`/nft/${soldOut}`)
    await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeDisabled()
    await expect(page.getByText('Edição indisponível no momento.')).toBeVisible()
  })
})
