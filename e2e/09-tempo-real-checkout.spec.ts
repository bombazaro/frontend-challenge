import { NFT, expect, test } from './fixtures'

test.describe('Tempo real durante a compra', () => {
  test('alteração de preço via Socket.IO bloqueia a confirmação até nova revisão @principal', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.waitForRealtime()
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog.getByTestId('review-total')).toHaveText('1.206 ETH')

    // O "servidor" altera o preço e emite nft.updated pelo socket
    await app.mock((m, id) => m.updateNft(id as string, { price: '1.50' }), NFT.emerald)

    await expect(dialog.getByText(/Preço, disponibilidade ou taxas mudaram/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await expect(dialog.getByTestId('review-total')).toHaveText('1.516 ETH')

    await dialog.getByRole('button', { name: 'Revisar novos valores' }).click()
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.516 ETH')
  })

  test('preço muda no momento da confirmação (409) e exige nova confirmação', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.setScenarios(['price-change-at-checkout'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(dialog.getByText(/Preço, disponibilidade ou taxas mudaram/)).toBeVisible()
    await expect(dialog.getByTestId('review-total')).toHaveText('1.306 ETH')
    await dialog.getByRole('button', { name: 'Revisar novos valores' }).click()
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    expect(await app.mock((m) => m.orders().length)).toBe(1)
  })

  test('edição esgotada durante a compra impede finalizar', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.setScenarios(['soldout-at-checkout'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(dialog.getByText('Há itens indisponíveis. Volte ao carrinho para ajustar.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test('carrinho aberto reflete preço e disponibilidade recebidos', async ({ app, page }) => {
    await app.addToCart(NFT.emerald, 2)
    await app.goto('/carrinho')
    await app.waitForRealtime()
    await expect(page.getByTestId('quote-subtotal')).toHaveText('2.38 ETH')
    await app.mock((m, id) => m.updateNft(id as string, { price: '2.00' }), NFT.emerald)
    await expect(page.getByTestId('cart-item-issue')).toContainText('Preço alterado: era 1.19 ETH')
    await expect(page.getByTestId('quote-subtotal')).toHaveText('4.00 ETH')
    await expect(page.getByTestId('live-region')).toContainText('Emerald Ape #042 foi atualizado')
    await page.getByRole('button', { name: 'Entendi, atualizar' }).click()
    await expect(page.getByTestId('cart-item-issue')).toHaveCount(0)

    await app.mock((m, id) => m.updateNft(id as string, { available: 1 }), NFT.emerald)
    await expect(page.getByTestId('cart-item-issue')).toContainText('Restam apenas 1 unidade(s)')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })
})
