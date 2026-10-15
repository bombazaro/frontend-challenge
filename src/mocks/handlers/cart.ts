import { HttpResponse, http } from 'msw'
import { NETWORKS, type AddCartItemRequest, type Network } from '@/contracts/api'
import { db, nextId, persist } from '../db'
import { cartKeyFor, computeQuote, findNft, getCart, maxQuantityFor, stripQuote, toCartView, touchCart, validateCoupon } from '../domain'
import { API, apiError, optionalUser, readJson, requireUser, simulateNetwork } from '../http-utils'

function resolveCart(request: Request) {
  const user = optionalUser(request)
  return getCart(cartKeyFor(user?.id ?? null, request.headers.get('X-Cart-Id')))
}

function quantityError(max: number) {
  return apiError(409, 'QUANTITY_LIMIT', max === 0 ? 'Esta edição está esgotada' : `Limite de ${max} unidade(s) para esta edição`, {
    details: { maxQuantity: max },
  })
}

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    await simulateNetwork(request)
    return HttpResponse.json(toCartView(resolveCart(request)))
  }),

  http.post(`${API}/cart/items`, async ({ request }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    const body = await readJson<AddCartItemRequest>(request)
    const nft = findNft(body.nftId)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    const edition = nft.editions.find((e) => e.id === body.editionId)
    if (!edition) return apiError(404, 'NOT_FOUND', 'Edição não encontrada')
    if (edition.available === 0) return apiError(409, 'EDITION_UNAVAILABLE', 'Esta edição está indisponível')
    if (!Number.isInteger(body.quantity) || body.quantity < 1) {
      return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida', { fieldErrors: { quantity: 'Informe uma quantidade inteira maior que zero' } })
    }
    const max = maxQuantityFor(nft, edition.id)
    const line = cart.lines.find((l) => l.nftId === nft.id && l.editionId === edition.id)
    const nextQty = (line?.quantity ?? 0) + body.quantity
    if (nextQty > max) return quantityError(max)
    if (line) {
      line.quantity = nextQty
      line.acknowledgedPrice = edition.price
    } else {
      cart.lines.push({ id: nextId('ci'), nftId: nft.id, editionId: edition.id, quantity: body.quantity, acknowledgedPrice: edition.price })
    }
    touchCart(cart)
    return HttpResponse.json(toCartView(cart), { status: 201 })
  }),

  http.patch(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    const line = cart.lines.find((l) => l.id === params.itemId)
    if (!line) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho')
    const { quantity } = await readJson<{ quantity: number }>(request)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida', { fieldErrors: { quantity: 'Quantidade mínima é 1' } })
    }
    const max = maxQuantityFor(findNft(line.nftId)!, line.editionId)
    if (quantity > max) return quantityError(max)
    line.quantity = quantity
    touchCart(cart)
    return HttpResponse.json(toCartView(cart))
  }),

  http.delete(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    cart.lines = cart.lines.filter((l) => l.id !== params.itemId)
    touchCart(cart)
    return HttpResponse.json(toCartView(cart))
  }),

  http.put(`${API}/cart/coupon`, async ({ request }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    const { code } = await readJson<{ code: string }>(request)
    if (!code?.trim()) return apiError(422, 'VALIDATION_ERROR', 'Informe um cupom', { fieldErrors: { code: 'Informe um cupom' } })
    cart.couponCode = validateCoupon(code)
    touchCart(cart)
    return HttpResponse.json(toCartView(cart))
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    cart.couponCode = null
    touchCart(cart)
    return HttpResponse.json(toCartView(cart))
  }),

  /** O usuário reconheceu as mudanças de preço exibidas */
  http.post(`${API}/cart/acknowledge`, async ({ request }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    for (const line of cart.lines) {
      const ed = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
      if (ed) line.acknowledgedPrice = ed.price
      if (ed && line.quantity > Math.min(ed.available, ed.maxPerOrder)) line.quantity = Math.min(ed.available, ed.maxPerOrder)
    }
    cart.lines = cart.lines.filter((l) => l.quantity > 0)
    touchCart(cart)
    return HttpResponse.json(toCartView(cart))
  }),

  /** Ao autenticar, os itens do visitante são preservados no carrinho do usuário */
  http.post(`${API}/cart/merge`, async ({ request }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const { guestCartId } = await readJson<{ guestCartId: string }>(request)
    const target = getCart(`user:${user.id}`)
    const guestKey = `guest:${guestCartId}`
    const guest = db().carts[guestKey]
    if (guest) {
      for (const g of guest.lines) {
        const nft = findNft(g.nftId)
        if (!nft) continue
        const max = maxQuantityFor(nft, g.editionId)
        const existing = target.lines.find((l) => l.nftId === g.nftId && l.editionId === g.editionId)
        if (existing) existing.quantity = Math.min(max, existing.quantity + g.quantity)
        else if (max > 0) target.lines.push({ ...g, id: nextId('ci'), quantity: Math.min(max, g.quantity) })
      }
      target.lines = target.lines.filter((l) => l.quantity > 0)
      if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
      delete db().carts[guestKey]
      touchCart(target)
    }
    persist()
    return HttpResponse.json(toCartView(target))
  }),

  http.post(`${API}/quote`, async ({ request }) => {
    await simulateNetwork(request)
    const cart = resolveCart(request)
    const { network } = await readJson<{ network: Network }>(request)
    if (!NETWORKS.includes(network)) return apiError(422, 'VALIDATION_ERROR', 'Rede inválida', { fieldErrors: { network: 'Selecione uma rede' } })
    return HttpResponse.json(stripQuote(computeQuote(cart, network)))
  }),
]
