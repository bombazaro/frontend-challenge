import { expect, test } from './fixtures'

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('Perfil e carteiras', () => {
  test('edição de dados com validação e conflito, avatar e senha', async ({ app, page }) => {
    await app.goto('/entrar?redirect=/perfil')
    await app.login('marina')
    const displayName = page.getByLabel('Nome de exibição')
    await expect(displayName).toHaveValue('Marina Costa')

    await displayName.fill('')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Informe o nome de exibição')).toBeVisible()

    // Conflito retornado pela API
    await displayName.fill('Marina C.')
    await page.getByLabel('Nome de usuário').fill('rafael')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('marina_c')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado').first()).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('marina_c')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Marina C.')

    // Avatar: formato inválido e válido
    await page.getByTestId('avatar-input').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByText('Use uma imagem PNG, JPG ou WEBP.')).toBeVisible()
    await page.getByTestId('avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX })
    await expect(page.getByTestId('avatar-image')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('avatar-image')).toBeVisible()

    // Senha: erros de validação, senha atual incorreta e sucesso
    await page.getByLabel('Senha atual').fill('Errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('Nova@2027X')
    await page.getByLabel('Confirmar nova senha').fill('Diferente1')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('As senhas não conferem')).toBeVisible()
    await page.getByLabel('Confirmar nova senha').fill('Nova@2027X')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()
    await page.getByLabel('Senha atual').fill('Kurio@2026')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha alterada com sucesso').first()).toBeVisible()
  })

  test('cadastro e edição de carteiras principal e secundária', async ({ app, page }) => {
    await app.goto('/entrar?redirect=/perfil/carteiras')
    await app.login('rafael')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Endereço inválido/)).toBeVisible()
    await primary.getByLabel('Endereço da carteira').fill('0x3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2D')
    await primary.getByLabel('Apelido da carteira').fill('Principal do Rafa')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva').first()).toBeVisible()

    // Secundária: reutiliza dados da principal, mas endereço duplicado gera conflito da API
    await page.getByLabel('Igual à carteira principal').check()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await expect(secondary.getByLabel('Nome do perfil')).toHaveValue('rafael')
    await secondary.getByLabel('Endereço da carteira').fill('0x3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2D')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText('Este endereço já está cadastrado')).toBeVisible()
    await secondary.getByLabel('Endereço da carteira').fill('0x9999999999999999999999999999999999999999')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva').first()).toBeVisible()

    await page.reload()
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Endereço da carteira')).toHaveValue('0x9999999999999999999999999999999999999999')
    await expect(page.getByRole('form', { name: 'Carteira principal' }).getByLabel('Apelido da carteira')).toHaveValue('Principal do Rafa')
  })
})
