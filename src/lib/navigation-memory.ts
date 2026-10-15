/**
 * Lembra a última página pública visitada. Usada ao fechar o login/cadastro:
 * se o destino (`redirect`) for uma página privada, voltar para ele reabriria o login.
 */
const PRIVATE_PREFIXES = ['/pagamento', '/pedidos', '/perfil']
const AUTH_PATHS = ['/entrar', '/cadastro']

let lastPublicHref = '/'

export function isPrivatePath(href: string) {
  const path = href.split(/[?#]/)[0]
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

export function rememberLocation(pathname: string, href: string) {
  if (AUTH_PATHS.includes(pathname) || isPrivatePath(pathname)) return
  lastPublicHref = href
}

export function getLastPublicHref() {
  return lastPublicHref
}
