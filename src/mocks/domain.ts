import Big from 'big.js'
import type { Cart, CartItem, Network, Nft, NftSummary, Quote, QuoteIssue, QuoteLine } from '@/contracts/api'
import { COUPONS, NETWORK_FEES, type NftRecord } from './data/fixtures'
import { db, nextId, nowIso, persist, type CartRecord, type OrderRecord, type QuoteRecord } from './db'
import { apiError } from './http-utils'
import { buildNftEvent, emitNftUpdated, emitOrderUpdated } from './realtime'
import { isActive, mockConfig } from './scenarios'

/** Regras de negócio do servidor simulado (catálogo, carrinho, cotação e pedidos). */

const eth = (v: Big) => v.toFixed(6).replace(/\.?0+$/, '') || '0'

// ---------------- Catálogo ----------------
export function findNft(id: string) {
  return db().nfts.find((n) => n.id === id) ?? null
}

export function defaultEdition(nft: NftRecord) {
  return nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]
}

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    category: nft.category,
    network: nft.network,
    price: defaultEdition(nft).price,
    compareAtPrice: nft.compareAtPrice,
    badge: nft.badge,
    soldOut: nft.editions.every((e) => e.available === 0),
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): Nft {
  const networkLabel = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }[nft.network]
  return {
    ...toSummary(nft),
    collection: nft.collection,
    description: nft.description,
    details: [
      `${nft.name} é uma obra digital finalizada à mão da coleção ${nft.collection}. Cada atributo fica armazenado nos metadados do token e é verificado na ${networkLabel}.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. O criador recebe ${nft.royaltyPct}% de direitos autorais nas vendas secundárias.`,
    ],
    attributes: nft.attributes,
    gallery: [nft.image, nft.image, nft.image, nft.image],
    rating: nft.rating,
    reviewsCount: nft.reviewsCount,
    contractAddress: nft.contractAddress,
    royaltyPct: nft.royaltyPct,
    editions: nft.editions,
    defaultEditionId: nft.defaultEditionId,
  }
}

/** Altera preço/disponibilidade, incrementa a versão e emite `nft.updated`. */
export function updateNft(nftId: string, change: { price?: string; editionId?: string; available?: number }) {
  const nft = findNft(nftId)
  if (!nft) throw new Error(`NFT ${nftId} não encontrado`)
  const edition = nft.editions.find((e) => e.id === (change.editionId ?? nft.defaultEditionId))
  if (!edition) throw new Error('Edição inexistente')
  if (change.price !== undefined) edition.price = new Big(change.price).toFixed(2)
  if (change.available !== undefined) edition.available = Math.max(0, change.available)
  nft.version += 1
  persist()
  const event = buildNftEvent(nft)
  emitNftUpdated(event)
  return event
}

// ---------------- Carrinho ----------------
export function cartKeyFor(userId: string | null, guestId: string | null) {
  if (userId) return `user:${userId}`
  if (guestId && /^guest_[\w-]{8,}$/.test(guestId)) return `guest:${guestId}`
  throw apiError(400, 'VALIDATION_ERROR', 'Carrinho não identificado (X-Cart-Id ausente)')
}

export function getCart(key: string): CartRecord {
  const carts = db().carts
  if (!carts[key]) {
    carts[key] = { key, owner: key.startsWith('user:') ? 'user' : 'guest', lines: [], couponCode: null, revision: 1, updatedAt: nowIso() }
  }
  return carts[key]
}

export function touchCart(cart: CartRecord) {
  cart.revision += 1
  cart.updatedAt = nowIso()
  persist()
}

export function maxQuantityFor(nft: NftRecord, editionId: string) {
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) return 0
  return Math.min(edition.available, edition.maxPerOrder)
}

export function toCartView(cart: CartRecord): Cart {
  const items: CartItem[] = []
  for (const line of cart.lines) {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) continue
    const maxQuantity = maxQuantityFor(nft, line.editionId)
    let issue: CartItem['issue'] = null
    if (edition.available === 0) issue = 'sold_out'
    else if (line.quantity > maxQuantity) issue = 'quantity_reduced'
    else if (!new Big(edition.price).eq(line.acknowledgedPrice)) issue = 'price_changed'
    items.push({
      id: line.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      quantity: line.quantity,
      unitPrice: edition.price,
      lineTotal: eth(new Big(edition.price).times(line.quantity)),
      available: edition.available,
      maxQuantity,
      acknowledgedPrice: line.acknowledgedPrice,
      issue,
    })
  }
  const coupon = cart.couponCode && COUPONS[cart.couponCode] ? { code: cart.couponCode, description: COUPONS[cart.couponCode].description } : null
  return {
    id: cart.key,
    owner: cart.owner,
    revision: cart.revision,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    coupon,
    updatedAt: cart.updatedAt,
  }
}

export function validateCoupon(code: string) {
  const normalized = code.trim().toUpperCase()
  const coupon = COUPONS[normalized]
  if (!coupon) throw apiError(422, 'COUPON_INVALID', 'Cupom inválido', { fieldErrors: { code: 'Cupom inválido' } })
  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou', { fieldErrors: { code: 'Este cupom expirou' } })
  }
  return normalized
}

// ---------------- Cotação ----------------
export function computeQuote(cart: CartRecord, network: Network): QuoteRecord {
  const view = toCartView(cart)
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = view.items.map((item) => {
    if (item.issue === 'sold_out') issues.push({ type: 'sold_out', cartItemId: item.id, message: `${item.name} (${item.editionLabel}) esgotou.` })
    if (item.issue === 'quantity_reduced')
      issues.push({ type: 'quantity_reduced', cartItemId: item.id, message: `${item.name}: restam apenas ${item.maxQuantity} unidade(s).` })
    if (item.issue === 'price_changed')
      issues.push({ type: 'price_changed', cartItemId: item.id, message: `O preço de ${item.name} mudou de ${item.acknowledgedPrice} para ${item.unitPrice} ETH.` })
    return {
      cartItemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      editionLabel: item.editionLabel,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }
  })

  const subtotal = lines.reduce((sum, l) => sum.plus(l.lineTotal), new Big(0))
  let discount = new Big(0)
  let coupon = view.coupon
  if (cart.couponCode) {
    const def = COUPONS[cart.couponCode]
    if (!def || new Date(def.expiresAt).getTime() < Date.now()) {
      issues.push({ type: 'coupon_expired', message: 'O cupom aplicado não é mais válido e foi desconsiderado.' })
      coupon = null
    } else {
      discount = def.kind === 'percent' ? subtotal.times(def.value).div(100) : new Big(def.value)
      if (discount.gt(subtotal)) discount = subtotal
      discount = discount.round(6, Big.roundDown)
    }
  }
  const fee = lines.length ? new Big(NETWORK_FEES[network]) : new Big(0)
  const total = subtotal.minus(discount).plus(fee)
  const createdAt = Date.now()

  const quote: QuoteRecord = {
    id: nextId('qt'),
    cartKey: cart.key,
    cartRevision: cart.revision,
    network,
    lines,
    subtotal: eth(subtotal),
    discount: eth(discount),
    networkFee: eth(fee),
    total: eth(total),
    coupon,
    issues,
    purchasable: lines.length > 0 && !issues.some((i) => i.type === 'sold_out' || i.type === 'quantity_reduced'),
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + 10 * 60_000).toISOString(),
  }
  db().quotes[quote.id] = quote
  persist()
  return quote
}

/** A cotação continua válida se recalculá-la agora produzir exatamente os mesmos valores. */
export function isQuoteCurrent(quote: QuoteRecord, cart: CartRecord) {
  if (quote.cartRevision !== cart.revision) return false
  if (new Date(quote.expiresAt).getTime() < Date.now()) return false
  const fresh = computeQuote(cart, quote.network)
  delete db().quotes[fresh.id]
  const sameLines =
    fresh.lines.length === quote.lines.length &&
    fresh.lines.every((l, i) => l.unitPrice === quote.lines[i].unitPrice && l.quantity === quote.lines[i].quantity)
  // Avisos de "preço mudou" são informativos: a cotação revisada já contém os valores novos
  return sameLines && fresh.total === quote.total && fresh.purchasable
}

export function stripQuote(q: QuoteRecord): Quote {
  const { cartKey: _c, ...rest } = q
  return rest
}

// ---------------- Pedidos ----------------
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function txHashFor(orderId: string) {
  let hex = ''
  for (let i = 0; hex.length < 64; i++) hex += ((orderId.charCodeAt(i % orderId.length) * (i + 7)) % 256).toString(16).padStart(2, '0')
  return `0x${hex.slice(0, 64)}`
}

export function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || isActive('manual-settlement')) return
  clearTimeout(timers.get(order.id))
  const wait = Math.max(0, order.settleAt - Date.now())
  timers.set(
    order.id,
    setTimeout(() => settleOrder(order.id, isActive('payment-refused') ? 'refused' : 'confirmed'), wait),
  )
}

/** Liquida um pedido pendente. Estados confirmados/recusados são terminais. */
export function settleOrder(orderId: string, status: 'confirmed' | 'refused', reason?: string) {
  const order = db().orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  timers.delete(orderId)

  if (status === 'confirmed') {
    // Revalida disponibilidade no momento da liquidação
    const short = order.lines.find((l) => {
      const ed = findNft(l.nftId)?.editions.find((e) => e.id === l.editionId)
      return !ed || ed.available < l.quantity
    })
    if (short) {
      status = 'refused'
      reason = `${short.name} (${short.editionLabel}) esgotou antes da confirmação.`
    }
  }

  order.status = status
  order.version += 1
  order.updatedAt = nowIso()

  if (status === 'confirmed') {
    order.txHash = txHashFor(order.id)
    order.explorerUrl = `https://etherscan.io/tx/${order.txHash}`
    const touched = new Set<string>()
    for (const line of order.lines) {
      const nft = findNft(line.nftId)
      const ed = nft?.editions.find((e) => e.id === line.editionId)
      if (nft && ed) {
        ed.available -= line.quantity
        touched.add(nft.id)
      }
    }
    // Remove do carrinho apenas os itens e quantidades comprados
    const cart = db().carts[`user:${order.userId}`]
    if (cart) {
      for (const line of order.lines) {
        const cartLine = cart.lines.find((l) => l.nftId === line.nftId && l.editionId === line.editionId)
        if (!cartLine) continue
        cartLine.quantity -= line.quantity
      }
      cart.lines = cart.lines.filter((l) => l.quantity > 0)
      if (order.couponCode && cart.couponCode === order.couponCode) cart.couponCode = null
      touchCart(cart)
    }
    persist()
    touched.forEach((id) => {
      const nft = findNft(id)!
      nft.version += 1
      persist()
      emitNftUpdated(buildNftEvent(nft))
    })
  } else {
    order.failureReason = reason ?? 'Pagamento recusado pela carteira. Nenhum valor foi debitado.'
    persist()
  }
  emitOrderUpdated(order)
  return order
}

/** Retoma timers de pedidos pendentes após refresh (estado persistido). */
export function resumePendingOrders() {
  Object.values(db().orders)
    .filter((o) => o.status === 'pending')
    .forEach(scheduleSettlement)
}

export function newOrderSettleAt() {
  return Date.now() + mockConfig.settleDelayMs
}
