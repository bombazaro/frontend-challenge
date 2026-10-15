import type { Network, Order, Quote, User, Wallet, WalletConnection } from '@/contracts/api'
import { SEED_USERS, buildNftFixtures, type NftRecord } from './data/fixtures'

/**
 * "Banco" do servidor simulado. Vive apenas na camada de mocks e é persistido no localStorage
 * para sobreviver a refresh. `resetDb()` restaura integralmente o cenário conhecido.
 */

export interface UserRecord extends User {
  passwordHash: string
  salt: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface CartLine {
  id: string
  nftId: string
  editionId: string
  quantity: number
  acknowledgedPrice: string
}

export interface CartRecord {
  key: string
  owner: 'guest' | 'user'
  lines: CartLine[]
  couponCode: string | null
  revision: number
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  cartKey: string
}

export interface OrderRecord extends Order {
  idempotencyKey: string
  requestHash: string
  settleAt: number
}

export interface WalletRecord extends Wallet {
  userId: string
}

export interface DbState {
  schema: 1
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, string>
  wallets: WalletRecord[]
  connections: Record<string, WalletConnection & { userId: string }>
  seq: number
  eventSeq: number
}

const STORAGE_KEY = 'kurio:mock-db:v1'
export const SESSION_TTL_MS = 60 * 60_000

let state: DbState | null = null

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function createSeed(): Promise<DbState> {
  const now = '2026-07-01T12:00:00.000Z'
  const users: UserRecord[] = []
  for (const seed of SEED_USERS) {
    const salt = `salt-${seed.id}`
    users.push({
      id: seed.id,
      username: seed.username,
      displayName: seed.displayName,
      email: seed.email,
      ensName: seed.ensName,
      walletNickname: seed.walletNickname,
      avatarUrl: null,
      createdAt: now,
      salt,
      passwordHash: await hashPassword(seed.password, salt),
    })
  }

  const wallet = (id: string, userId: string, role: 'primary' | 'secondary', network: Network, partial: Partial<WalletRecord>): WalletRecord => ({
    id,
    userId,
    role,
    network,
    displayName: 'Marina Costa',
    nickname: role === 'primary' ? 'Principal' : 'Reserva',
    profileName: 'marina',
    address: '0xA91F2c4b7D3e8a1F0b6C5d9E2f4A7b3C8d1EE82C',
    secondaryAddress: '',
    provider: 'metamask',
    referralCode: 'KURIO',
    email: 'marina@kurio.dev',
    ensName: 'marina',
    connectedNetwork: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  })

  return {
    schema: 1,
    users,
    sessions: [],
    nfts: buildNftFixtures(),
    favorites: { usr_marina: ['emerald-ape-042'], usr_rafael: [] },
    carts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: [
      wallet('wal_marina_1', 'usr_marina', 'primary', 'ethereum', {}),
      wallet('wal_marina_2', 'usr_marina', 'secondary', 'polygon', {
        address: '0x5b3D9e1A7c2F4e8B0a6D3c9F1e2A4b7C8d0F1a2B',
        secondaryAddress: 'nova.kurio.eth',
        provider: 'coinbase',
      }),
      wallet('wal_rafael_1', 'usr_rafael', 'primary', 'ethereum', {
        displayName: 'Rafael Lima',
        profileName: 'rafael',
        email: 'rafael@kurio.dev',
        ensName: 'rafael',
        address: '0x3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2D',
        provider: 'walletconnect',
      }),
    ],
    connections: {},
    seq: 1000,
    eventSeq: 0,
  }
}

export async function initDb() {
  if (state) return state
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === 1) state = parsed
    }
  } catch {
    state = null
  }
  if (!state) {
    state = await createSeed()
    persist()
  }
  return state
}

export async function resetDb() {
  state = await createSeed()
  persist()
  return state
}

export function db(): DbState {
  if (!state) throw new Error('Mock DB não inicializado')
  return state
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage cheio/indisponível: segue em memória
  }
}

export function nextId(prefix: string) {
  const s = db()
  s.seq += 1
  return `${prefix}_${s.seq.toString(36)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function toPublicUser(user: UserRecord): User {
  const { passwordHash: _h, salt: _s, ...rest } = user
  return rest
}
