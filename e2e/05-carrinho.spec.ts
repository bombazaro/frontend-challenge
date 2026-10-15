import { NFT, expect, test } from './fixtures'

test.describe('Carrinho', () => {
  test('quantidades, remoção, cupom e persistência após refresh e login @principal', async ({ app, page }) => {
    await app.addToCart(NFT.emerald, 2)
    await app.addToCart(NFT.sage, 1)
    await app.goto('/carrinho')
    await expect(page.getByTestId('cart-item')).toHaveCount(2)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('4.07 ETH') // 2×1.19 + 1.69

    await page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).click()
    await expect(page.getByTestId('quote-subtotal')).toHaveText('5.26 ETH')

    await page.getByRole('button', { name: 'Remover Sage Nomad #009 do carrinho' }).first().click()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('3.57 ETH')

    // Cupom inválido / expirado / válido
    const coupon = page.getByLabel('Código promocional')
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom inválido')).toBeVisible()
    await coupon.fill('VERAO2024')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este cupom expirou')).toBeVisible()
    await coupon.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.357 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('3.229 ETH') // 3.57 - 0.357 + 0.016

    // Refresh mantém o carrinho do visitante
    await page.reload()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Remover cupom KURIO10' })).toBeVisible()

    // Login preserva os itens do visitante
    await app.goto('/entrar?redirect=/carrinho')
    await app.login('marina')
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('3.57 ETH')

    // Remover cupom
    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.00 ETH')
  })
})
