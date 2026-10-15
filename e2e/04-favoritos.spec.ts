import { NFT, expect, test } from './fixtures'

test.describe('Favoritos', () => {
  test('exige login, persiste e faz rollback em falha', async ({ app, page }) => {
    await app.goto(`/nft/${NFT.sage}`)
    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await app.login('marina')
    await expect(page).toHaveURL(new RegExp(`/nft/${NFT.sage}`))

    const fav = page.getByRole('button', { name: /^(Favoritar|Favoritado)$/ })
    await fav.click()
    await expect(fav).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Adicionado aos favoritos')).toBeVisible()
    await page.reload()
    await expect(fav).toHaveAttribute('aria-pressed', 'true')

    // Falha na mutation: atualização otimista é revertida
    await app.setScenarios(['favorites-error'])
    await fav.click()
    await expect(page.getByText(/Não foi possível atualizar os favoritos/)).toBeVisible()
    await expect(fav).toHaveAttribute('aria-pressed', 'true')

    // Recuperação
    await app.setScenarios([])
    await fav.click()
    await expect(fav).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Removido dos favoritos')).toBeVisible()
  })
})
