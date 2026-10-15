import { HttpResponse, delay } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts/api'
import { db, toPublicUser, type UserRecord } from './db'
import { isActive, mockConfig, once } from './scenarios'

export const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

/** Resposta de erro no formato do contrato. Tipada como `any` para compor com as respostas de sucesso dos handlers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiError(status: number, code: ApiErrorCode, message: string, extra: Partial<ApiErrorBody['error']> = {}): HttpResponse<any> {
  const body: ApiErrorBody = { error: { code, message, ...extra } }
  return HttpResponse.json(body, { status })
}

const VARIABLE_LATENCY = [120, 1600, 400, 900, 2000, 250, 700]
let latencyCursor = 0

/**
 * Aplica as condições de rede configuradas (latência, offline, falhas transitórias).
 * Lança uma Response quando a requisição deve falhar — o MSW usa a Response lançada como resposta.
 */
export async function simulateNetwork(request: Request, opts: { latencyMs?: number } = {}) {
  if (isActive('offline')) throw HttpResponse.error()

  let ms = opts.latencyMs ?? mockConfig.baseLatencyMs
  if (isActive('slow')) ms = 2_500
  else if (isActive('variable-latency')) ms = VARIABLE_LATENCY[latencyCursor++ % VARIABLE_LATENCY.length]
  await delay(ms)

  if (request.method === 'GET') {
    const url = new URL(request.url)
    if (once('flaky', url.pathname)) {
      throw apiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente.')
    }
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw apiError(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido')
  }
}

function bearer(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Resolve o usuário da sessão. Token presente mas inválido/expirado => 401. */
export function optionalUser(request: Request): UserRecord | null {
  const token = bearer(request)
  if (!token) return null
  const session = db().sessions.find((s) => s.token === token)
  if (!session) throw apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const user = db().users.find((u) => u.id === session.userId)
  if (!user) throw apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  return user
}

export function requireUser(request: Request): UserRecord {
  const user = optionalUser(request)
  if (!user) throw apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
  return user
}

export function tokenOf(request: Request) {
  return bearer(request)
}

export { toPublicUser }
