import { NFT, expect, test } from './fixtures'

test.describe('Cadastro, login e sessão', () => {
  test('cadastro com validação, conflito e sucesso @principal', async ({ app, page }) => {
    await app.goto('/cadastro')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(page.getByText('Mínimo de 3 caracteres')).toBeVisible()
    await expect(page.getByPlaceholder('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await page.getByPlaceholder('Nome de usuário').fill('novo_colecionador')
    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill('marina@kurio.dev')
    await page.getByPlaceholder('Senha', { exact: true }).fill('Segura123')
    await page.getByPlaceholder('Confirmar senha').fill('Segura123')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(page.getByText('Este e-mail já está cadastrado')).toBeVisible()

    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill('novo@kurio.dev')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('link', { name: /Perfil de novo_colecionador/ }).or(page.getByRole('link', { name: 'Perfil', exact: true }))).toBeVisible()
  })

  test('login inválido e válido com retorno ao fluxo', async ({ app, page }) => {
    await app.goto('/perfil/carteiras')
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await page.getByPlaceholder('contato@email.com').fill('marina@kurio.dev')
    await page.getByPlaceholder('Senha').fill('errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
    await app.login('marina')
    await expect(page).toHaveURL(/\/perfil\/carteiras$/)

    // Sessão recuperável após refresh
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('expiração da sessão durante a navegação preserva o contexto', async ({ app, page }) => {
    await app.goto('/entrar')
    await app.login('marina')
    await app.goto('/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    // O servidor expira a sessão (equivale ao TTL de 60 min)
    await app.mock((m) => m.expireSessions())
    // A próxima chamada autenticada (navegação ou refetch em foco) recebe 401 SESSION_EXPIRED
    await page
      .getByRole('navigation', { name: 'Menu do perfil' })
      .getByRole('link', { name: 'Carteiras' })
      .click({ timeout: 3_000 })
      .catch(() => undefined)
    await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.').first()).toBeVisible()
    await app.login('marina')
    await expect(page).toHaveURL(/\/perfil/)
  })

  test('expiração durante o checkout volta ao pagamento após login', async ({ app, page }) => {
    await app.prepareCheckout()
    await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira principal')
    await app.mock((m) => m.expireSessions())
    await page.getByRole('button', { name: /Desconectar/ }).click()
    await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
    await app.login('marina')
    await expect(page).toHaveURL(/\/pagamento/)
    // Rascunho do formulário preservado
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar na carteira principal')
  })

  test('logout e troca de usuário isolam dados privados', async ({ app, page }) => {
    await app.goto('/entrar')
    await app.login('marina')
    await app.goto('/perfil/favoritos')
    await expect(page.getByTestId('nft-card')).toHaveCount(1)

    await app.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect.poll(() => app.mock((m) => m.connectedClients().map((c) => c.userId))).toEqual([null])

    await app.goto('/entrar')
    await app.login('rafael')
    await app.goto('/perfil/favoritos')
    await expect(page.getByText('Nenhum favorito ainda')).toBeVisible()
    await expect.poll(() => app.mock((m) => m.connectedClients().map((c) => c.userId))).toEqual(['usr_rafael'])
  })

  test('fechar o login sem autenticar volta à última página pública', async ({ app, page }) => {
    // Destino privado: fechar não pode reabrir o login
    await app.addToCart(NFT.emerald)
    await app.goto('/carrinho')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByRole('dialog')).toBeHidden()

    // Destino público: volta para ele
    await app.goto(`/nft/${NFT.emerald}`)
    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(new RegExp(`/nft/${NFT.emerald}$`))
  })
})
