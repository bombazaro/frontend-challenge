import { NFT, expect, test } from './fixtures'

test.describe('Compra completa @principal', () => {
  test('do catálogo ao recibo confirmado', async ({ app, page }) => {
    await app.goto('/')
    await page.getByTestId('catalog-grid').getByRole('link', { name: 'Emerald Ape #042' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await page.getByRole('button', { name: /Aumentar quantidade/ }).click()
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click()

    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('2.38 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('2.396 ETH')

    // Checkout exige autenticação e retorna ao fluxo após login
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/entrar/)
    await app.login('marina')
    await expect(page).toHaveURL(/\/pagamento$/)

    await page.getByLabel('Código de indicação').fill('KURIO')
    await page.getByRole('button', { name: /Conectar na Ethereum/ }).click()
    await expect(page.getByTestId('wallet-primary').getByText('Conectada', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()

    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog.getByTestId('review-total')).toHaveText('2.396 ETH')
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/pedidos\//)
    await expect(page.getByTestId('order-pending').or(page.getByTestId('order-receipt'))).toBeVisible()
    const receipt = page.getByTestId('order-receipt')
    await expect(receipt).toBeVisible({ timeout: 15_000 })
    await expect(receipt.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(receipt.getByTestId('receipt-total')).toHaveText('2.396 ETH')
    await expect(receipt.getByTestId('tx-hash')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)

    // Itens comprados saem do carrinho
    await app.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

    // Recibo é snapshot: mudança posterior de preço não altera valores
    const orderUrl = await page.evaluate(() => localStorage.getItem('kurio:pending-order'))
    expect(orderUrl).toBeNull()
    await app.mock((m, id) => m.updateNft(id as string, { price: '9.99' }), NFT.emerald)
    await page.goBack()
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')
  })
})
