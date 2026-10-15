import { HttpResponse, delay, http } from 'msw'
import type { CreateOrderRequest, Order } from '@/contracts/api'
import { createOrderRequestSchema, toFieldErrors } from '@/contracts/schemas'
import { db, nextId, nowIso, persist, type OrderRecord } from '../db'
import { computeQuote, getCart, isQuoteCurrent, newOrderSettleAt, scheduleSettlement, settleOrder, stripQuote, updateNft } from '../domain'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { isActive, mockConfig, once } from '../scenarios'
import Big from 'big.js'

function stripOrder(o: OrderRecord): Order {
  const { idempotencyKey: _k, requestHash: _h, settleAt: _s, ...rest } = o
  return rest
}

export const orderHandlers = [
  http.post(`${API}/orders`, async ({ request }) => {
    await simulateNetwork(request, { latencyMs: 400 })
    const user = requireUser(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key || key.length < 8) return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório')

    const body = await readJson<CreateOrderRequest>(request)
    const parsed = createOrderRequestSchema.safeParse(body)
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Dados do pedido inválidos', { fieldErrors: toFieldErrors(parsed.error) })
    const requestHash = JSON.stringify(parsed.data)

    // Idempotência: mesma chave + mesmo conteúdo => mesmo pedido; conteúdo diferente => conflito
    const idemKey = `${user.id}:${key}`
    const existingId = db().idempotency[idemKey]
    if (existingId) {
      const existing = db().orders[existingId]
      if (existing.requestHash !== requestHash) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com dados diferentes')
      }
      return HttpResponse.json(stripOrder(existing), { status: 200 })
    }

    const cart = getCart(`user:${user.id}`)
    const quote = db().quotes[parsed.data.quoteId]
    if (!quote || quote.cartKey !== cart.key) return apiError(404, 'NOT_FOUND', 'Cotação não encontrada. Atualize o resumo.')

    const wallet = db().wallets.find((w) => w.id === parsed.data.walletId && w.userId === user.id)
    if (!wallet) return apiError(403, 'FORBIDDEN', 'Carteira não pertence a este usuário')
    const connection = db().connections[wallet.id]
    if (!connection || connection.network !== parsed.data.network) {
      return apiError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira na rede selecionada antes de confirmar')
    }

    // Cenários de corrida: preço/disponibilidade mudam no momento da confirmação
    const first = quote.lines[0]
    if (first && once('price-change-at-checkout')) {
      updateNft(first.nftId, { editionId: first.editionId, price: new Big(first.unitPrice).plus('0.10').toFixed(2) })
    }
    if (first && once('soldout-at-checkout')) {
      updateNft(first.nftId, { editionId: first.editionId, available: 0 })
    }

    if (!isQuoteCurrent(quote, cart)) {
      const fresh = computeQuote(cart, parsed.data.network)
      return apiError(409, 'QUOTE_STALE', 'Preço, disponibilidade ou taxas mudaram. Revise e confirme novamente.', {
        details: { quote: stripQuote(fresh) },
      })
    }

    const now = nowIso()
    const order: OrderRecord = {
      id: nextId('ord'),
      userId: user.id,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      network: parsed.data.network,
      wallet: { id: wallet.id, provider: wallet.provider, address: wallet.address, label: wallet.nickname },
      collector: parsed.data.collector,
      lines: quote.lines,
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      couponCode: quote.coupon?.code ?? null,
      txHash: null,
      explorerUrl: null,
      failureReason: null,
      idempotencyKey: key,
      requestHash,
      settleAt: newOrderSettleAt(),
    }
    db().orders[order.id] = order
    db().idempotency[idemKey] = order.id
    // O usuário confirmou os valores atuais: limpa os avisos de alteração de preço
    for (const line of cart.lines) {
      const current = order.lines.find((l) => l.nftId === line.nftId && l.editionId === line.editionId)
      if (current) line.acknowledgedPrice = current.unitPrice
    }
    persist()
    scheduleSettlement(order)

    // Pedido criado, mas a resposta chega depois do timeout do cliente
    if (once('order-timeout')) await delay(mockConfig.settleDelayMs + 8_000)
    return HttpResponse.json(stripOrder(order), { status: 201 })
  }),

  http.get(`${API}/orders/:id`, async ({ request, params }) => {
    await simulateNetwork(request)
    const user = requireUser(request)
    const order = db().orders[String(params.id)]
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado')
    if (order.userId !== user.id) return apiError(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido')
    // Recuperação após refresh: liquida pedidos cujo prazo já passou
    if (order.status === 'pending' && !isActive('manual-settlement') && order.settleAt <= Date.now()) {
      settleOrder(order.id, isActive('payment-refused') ? 'refused' : 'confirmed')
    }
    return HttpResponse.json(stripOrder(db().orders[order.id]))
  }),
]
