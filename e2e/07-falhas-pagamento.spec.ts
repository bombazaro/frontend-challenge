import { expect, test } from './fixtures'

test.describe('Falhas de pagamento e idempotência', () => {
  test('pagamento recusado preserva o carrinho', async ({ app, page }) => {
    await app.prepareCheckout()
    await app.setScenarios(['payment-refused'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-refused')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Pagamento recusado pela carteira')).toBeVisible()
    await page.getByRole('link', { name: 'Ver carrinho' }).click()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })

  test('cliques repetidos criam um único pedido', async ({ app, page }) => {
    await app.prepareCheckout()
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' })
    // Duplo clique + Enter repetido no mesmo botão
    await confirm.dblclick()
    await page.keyboard.press('Enter').catch(() => undefined)
    await expect(page).toHaveURL(/\/pedidos\//)
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    expect(await app.mock((m) => m.orders().length)).toBe(1)
  })

  test('timeout após criação recupera o mesmo pedido pela chave de idempotência', async ({ app, page }) => {
    test.setTimeout(60_000)
    await app.prepareCheckout()
    await app.setScenarios(['order-timeout'])
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('button', { name: 'Enviando pedido…' })).toBeVisible()
    await expect(page).toHaveURL(/\/pedidos\//, { timeout: 20_000 })
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    const orders = await app.mock((m) => m.orders())
    expect(orders).toHaveLength(1)
  })

  test('mesma chave com conteúdo diferente gera conflito', async ({ app, page }) => {
    await app.prepareCheckout()
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('kurio:token')
      const quote = await fetch('/api/quote', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ network: 'ethereum' }) }).then((r) => r.json())
      const body = (note: string) =>
        JSON.stringify({ quoteId: quote.id, walletId: 'wal_marina_1', network: 'ethereum', collector: { displayName: 'Marina', username: 'marina', profileName: 'marina', email: 'marina@kurio.dev', referralCode: 'KURIO', ensName: 'marina', note } })
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'idem_teste_conflito' }
      const a = await fetch('/api/orders', { method: 'POST', headers, body: body('a') })
      const b = await fetch('/api/orders', { method: 'POST', headers, body: body('a') })
      const c = await fetch('/api/orders', { method: 'POST', headers, body: body('b') })
      return { a: a.status, b: b.status, sameId: (await a.json()).id === (await b.json()).id, c: c.status, code: (await c.json()).error.code }
    })
    expect(result).toEqual({ a: 201, b: 200, sameId: true, c: 409, code: 'IDEMPOTENCY_CONFLICT' })
  })

  test('carteira recusa a conexão', async ({ app, page }) => {
    await app.goto('/entrar')
    await app.login('marina')
    await app.addToCart('emerald-ape-042')
    await app.goto('/pagamento', ['wallet-rejected'])
    await page.getByRole('button', { name: /Conectar na/ }).click()
    await expect(page.getByText('A conexão foi recusada na carteira.').first()).toBeVisible()
    await page.getByLabel('Código de indicação').fill('KURIO')
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    await expect(page.getByText(/Conecte a carteira na rede/).first()).toBeVisible()
  })
})
