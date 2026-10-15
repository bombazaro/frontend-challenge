import { expect, test } from './fixtures'

const cardNames = (page: import('@playwright/test').Page) => page.getByTestId('catalog-grid').getByRole('heading', { level: 3 }).allTextContents()

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e histórico', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)

    // Paginação compõe a URL
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    // Mudança de filtro reinicia a paginação
    await page.getByRole('checkbox', { name: /^Ethereum/ }).check()
    await expect(page).not.toHaveURL(/pagina=/)
    await expect(page).toHaveURL(/rede=/)

    // Filtros combináveis
    await page.getByRole('checkbox', { name: /^Arte digital/ }).check()
    await expect(page).toHaveURL(/categoria=/)

    // Ordenação por menor preço
    await page.getByLabel('Ordenar por:').selectOption('menor-preco')
    await expect(page).toHaveURL(/ordem=menor-preco/)
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false')
    const prices = (await page.getByTestId('catalog-grid').locator('p.text-accent > span:first-child').allTextContents()).map((t) => parseFloat(t))
    expect(prices.length).toBeGreaterThan(0)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)

    // Busca
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('nomad')
    await expect(page).toHaveURL(/q=nomad/)
    await expect.poll(async () => (await cardNames(page)).every((n) => /nomad/i.test(n))).toBe(true)

    // Sobrevive a refresh
    await page.reload()
    await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('nomad')
    await expect(page.getByRole('checkbox', { name: /^Ethereum/ })).toBeChecked()

    // Histórico: voltar desfaz a ordenação (busca substitui a entrada atual)
    await page.goBack()
    await expect(page).not.toHaveURL(/ordem=/)
    await expect(page.getByLabel('Ordenar por:')).toHaveValue('recentes')
    await page.goForward()
    await expect(page.getByLabel('Ordenar por:')).toHaveValue('menor-preco')
  })

  test('resultado vazio e limpeza dos filtros', async ({ app, page }) => {
    await app.goto('/?q=inexistente-xyz')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })

  test('descarta respostas fora de ordem', async ({ app, page }) => {
    // 1ª resposta do catálogo demora 1,8 s; a busca seguinte responde em 200 ms
    await app.goto('/', ['out-of-order'])
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('baron')
    await expect.poll(() => cardNames(page), { timeout: 6_000 }).toEqual(expect.arrayContaining([expect.stringMatching(/Baron/)]))
    await page.waitForTimeout(2_000) // tempo para a resposta antiga chegar
    expect((await cardNames(page)).every((n) => /baron/i.test(n))).toBe(true)
  })

  test('busca no mobile @principal', async ({ app, page }) => {
    await app.goto('/')
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    await expect.poll(async () => (await cardNames(page)).every((n) => /golden/i.test(n))).toBe(true)
  })
})
