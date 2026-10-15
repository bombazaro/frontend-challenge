import { NFT, expect, test } from './fixtures'

test.describe('Acessibilidade', () => {
  test('skip link e navegação por teclado até o NFT', async ({ app, page }) => {
    await app.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    const card = page.getByTestId('catalog-grid').getByRole('link', { name: 'Emerald Ape #042' })
    await card.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/nft/${NFT.emerald}`))
  })

  test('foco preso no diálogo e devolvido ao fechar', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.emerald}`)
    const zoom = page.getByRole('button', { name: 'Ampliar imagem' })
    await zoom.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(zoom).toBeFocused()
  })

  test('drawer de filtros no mobile controla o foco @principal', async ({ app, page, isMobile }) => {
    test.skip(!isMobile, 'drawer só existe no mobile')
    await app.goto('/')
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('checkbox', { name: /^Música/ }).check()
    await expect(page).toHaveURL(/categoria=/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Abrir filtros' })).toBeFocused()
  })

  test('erros de formulário associados aos campos', async ({ app, page }) => {
    await app.goto('/entrar')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.getByPlaceholder('contato@email.com')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe o e-mail')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(email).toBeFocused()
  })
})

test('sem overflow horizontal em 390, 768 e 1440 px', async ({ app, page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/nft/emerald-ape-042', '/carrinho', '/entrar']) {
      await app.goto(path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${path} @ ${width}px`).toBeLessThanOrEqual(0)
    }
  }
})
