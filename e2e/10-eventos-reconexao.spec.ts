import { NFT, expect, test } from './fixtures'

test.describe('Eventos duplicados/antigos, desconexão e retomada', () => {
  test('ignora eventos antigos e duplicados', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.emerald}`)
    await app.waitForRealtime()
    await expect(page.getByTestId('nft-price')).toContainText('1.19 ETH')

    await app.mock((m, id) => m.emitStaleNftEvent(id as string, '0.01'), NFT.emerald)
    await page.waitForTimeout(300)
    await expect(page.getByTestId('nft-price')).toContainText('1.19 ETH')

    await app.mock((m, id) => m.updateNft(id as string, { price: '1.50' }), NFT.emerald)
    await expect(page.getByTestId('nft-price')).toContainText('1.50 ETH')

    await app.mock((m, id) => m.emitDuplicateNftEvent(id as string), NFT.emerald)
    await app.mock((m, id) => m.emitStaleNftEvent(id as string, '0.02'), NFT.emerald)
    await page.waitForTimeout(300)
    await expect(page.getByTestId('nft-price')).toContainText('1.50 ETH')
  })

  test('queda de conexão com pedido pendente e retomada sem nova compra', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.setScenarios(['manual-settlement'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const orderId = page.url().split('/pedidos/')[1]

    // Servidor de tempo real cai; pedido é confirmado enquanto o cliente está offline
    await app.setScenarios(['manual-settlement', 'realtime-offline'])
    await app.mock((m) => m.dropRealtime())
    await expect(page.getByText(/Reconectando/)).toBeVisible()
    await app.mock((m, id) => m.settleOrder(id as string, 'confirmed'), orderId)

    // Ao reconectar, o estado é reconciliado com a API REST
    await app.setScenarios(['manual-settlement'])
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    expect(await app.mock((m) => m.orders().length)).toBe(1)
  })

  test('refresh com pedido pendente recupera o estado', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.setScenarios(['manual-settlement'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const orderId = page.url().split('/pedidos/')[1]

    await page.reload()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    // Checkout bloqueia nova compra enquanto há pedido pendente
    await app.goto('/pagamento')
    await expect(page.getByText('Você tem um pedido em processamento.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Revisar e confirmar compra' })).toBeDisabled()

    await page.getByRole('link', { name: 'Acompanhar pedido' }).click()
    await app.waitForRealtime()
    await app.mock((m, id) => m.settleOrder(id as string, 'confirmed'), orderId)
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    // Estado terminal não regride
    await app.mock((m, id) => m.settleOrder(id as string, 'refused'), orderId)
    await page.reload()
    await expect(page.getByTestId('order-receipt')).toBeVisible()
  })
})
