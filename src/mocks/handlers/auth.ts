import { HttpResponse, http } from 'msw'
import type { AuthResponse, LoginRequest, RegisterRequest, Session } from '@/contracts/api'
import { registerRequestSchema, toFieldErrors } from '@/contracts/schemas'
import { SESSION_TTL_MS, db, hashPassword, nextId, nowIso, persist, toPublicUser, type UserRecord } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork, tokenOf } from '../http-utils'

function openSession(user: UserRecord): AuthResponse {
  const token = `tok_${crypto.randomUUID().replace(/-/g, '')}`
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db().sessions.push({ token, userId: user.id, expiresAt })
  persist()
  return { token, session: { user: toPublicUser(user), expiresAt } }
}

export const authHandlers = [
  http.post(`${API}/auth/register`, async ({ request }) => {
    await simulateNetwork(request)
    const body = await readJson<RegisterRequest>(request)
    const parsed = registerRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados', { fieldErrors: toFieldErrors(parsed.error) })
    }
    const { username, email, password } = parsed.data
    const users = db().users
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado', { fieldErrors: { email: 'Este e-mail já está cadastrado' } })
    }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', {
        fieldErrors: { username: 'Este nome de usuário já está em uso' },
      })
    }
    const id = nextId('usr')
    const salt = `salt-${id}`
    const user: UserRecord = {
      id,
      username,
      displayName: username,
      email,
      ensName: username.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      walletNickname: 'Minha carteira',
      avatarUrl: null,
      createdAt: nowIso(),
      salt,
      passwordHash: await hashPassword(password, salt),
    }
    users.push(user)
    db().favorites[id] = []
    persist()
    return HttpResponse.json(openSession(user), { status: 201 })
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    await simulateNetwork(request)
    const body = await readJson<LoginRequest>(request)
    const user = db().users.find((u) => u.email.toLowerCase() === String(body.email ?? '').trim().toLowerCase())
    const valid = user && (await hashPassword(String(body.password ?? ''), user.salt)) === user.passwordHash
    if (!user || !valid) return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos')
    return HttpResponse.json(openSession(user))
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    await simulateNetwork(request, { latencyMs: 80 })
    const user = requireUser(request)
    const session = db().sessions.find((s) => s.token === tokenOf(request))!
    return HttpResponse.json<Session>({ user: toPublicUser(user), expiresAt: session.expiresAt })
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    await simulateNetwork(request, { latencyMs: 80 })
    const token = tokenOf(request)
    db().sessions = db().sessions.filter((s) => s.token !== token)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]
