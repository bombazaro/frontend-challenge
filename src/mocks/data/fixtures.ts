import Big from 'big.js'
import type { Category, Edition, Network, NftReview } from '@/contracts/api'

/**
 * Fixtures determinísticas: o mesmo seed gera sempre o mesmo catálogo,
 * o que mantém testes E2E e regressão visual estáveis.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  image: string
  category: Category
  network: Network
  compareAtPrice: string | null
  badge: string | null
  listedAt: string
  popularity: number
  collection: string
  description: string
  attributes: string[]
  rating: number
  reviewsCount: number
  contractAddress: string
  royaltyPct: number
  editions: Edition[]
  defaultEditionId: string
  featured: boolean
  version: number
}

export interface UserSeed {
  id: string
  username: string
  displayName: string
  email: string
  password: string
  ensName: string
  walletNickname: string
}

export const SEED_USERS: UserSeed[] = [
  {
    id: 'usr_marina',
    username: 'marina',
    displayName: 'Marina Costa',
    email: 'marina@kurio.dev',
    password: 'Kurio@2026',
    ensName: 'marina',
    walletNickname: 'Cofre da Marina',
  },
  {
    id: 'usr_rafael',
    username: 'rafael',
    displayName: 'Rafael Lima',
    email: 'rafael@kurio.dev',
    password: 'Kurio@2026',
    ensName: 'rafael',
    walletNickname: 'Carteira do Rafa',
  },
]

export const COUPONS: Record<string, { description: string; kind: 'percent' | 'fixed'; value: string; expiresAt: string }> = {
  KURIO10: { description: '10% de desconto no lançamento', kind: 'percent', value: '10', expiresAt: '2099-12-31T23:59:59Z' },
  GENESIS: { description: '0.05 ETH de desconto', kind: 'fixed', value: '0.05', expiresAt: '2099-12-31T23:59:59Z' },
  VERAO2024: { description: '15% de desconto (campanha encerrada)', kind: 'percent', value: '15', expiresAt: '2024-03-01T00:00:00Z' },
}

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const IMAGES = {
  ape: '/nfts/emerald-ape.webp',
  nomad: '/nfts/sage-nomad.webp',
  baron: '/nfts/ivory-baron.webp',
  beat: '/nfts/golden-beat.webp',
}

/** Itens fixos que reproduzem o layout do Figma (primeira página do catálogo). */
const DESIGN_ITEMS: Array<{ name: string; token: string; price: string; image: keyof typeof IMAGES; compareAt?: string; badge?: string }> = [
  { name: 'Emerald Ape', token: '042', price: '1.19', image: 'ape', badge: 'RARO' },
  { name: 'Sage Nomad', token: '009', price: '1.69', image: 'nomad' },
  { name: 'Neon Vessel', token: '552', price: '1.99', image: 'baron', compareAt: '2.29' },
  { name: 'Cosmic Bloom', token: '118', price: '1.29', image: 'nomad' },
  { name: 'Violet Nomad', token: '314', price: '1.39', image: 'nomad' },
  { name: 'Ivory Baron', token: '088', price: '1.79', image: 'baron' },
  { name: 'Golden Beat', token: '207', price: '0.99', image: 'beat' },
  { name: 'Amber Pulse', token: '063', price: '0.59', image: 'beat' },
  { name: 'Golden Signal', token: '160', price: '0.39', image: 'beat' },
]

const ADJECTIVES = ['Onyx', 'Copper', 'Velvet', 'Lunar', 'Solar', 'Jade', 'Rust', 'Indigo', 'Cobalt', 'Saffron', 'Ash', 'Coral', 'Mint']
const NOUNS: Array<[string, keyof typeof IMAGES]> = [
  ['Ape', 'ape'],
  ['Monk', 'nomad'],
  ['Drifter', 'baron'],
  ['Echo', 'beat'],
  ['Pilot', 'ape'],
  ['Sage', 'nomad'],
  ['Duke', 'baron'],
  ['Groove', 'beat'],
]
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Raro', 'Chapéu', 'Moletom', 'Fones', 'Terno', 'Brinco', 'Jaqueta', 'Dourado']

const TOTAL_NFTS = 48
const BASE_DATE = Date.UTC(2026, 6, 29, 12, 0, 0) // 29/07/2026 — datas estáveis

function money(value: Big) {
  return value.round(2, Big.roundHalfUp).toFixed(2)
}

function buildEditions(base: string, rand: () => number, index: number): Edition[] {
  const b = new Big(base)
  const tenAvailable = index % 7 === 3 ? 0 : 2 + Math.floor(rand() * 6)
  return [
    { id: 'ed-1-1', label: '1/1', supply: 1, available: index % 3 === 0 ? 0 : 1, maxPerOrder: 1, price: money(b.times(3)) },
    { id: 'ed-1-10', label: '1/10', supply: 10, available: tenAvailable, maxPerOrder: 3, price: money(b.times(1.5)) },
    { id: 'ed-1-50', label: '1/50', supply: 50, available: 20 + Math.floor(rand() * 25), maxPerOrder: 10, price: money(b) },
    { id: 'ed-aberta', label: 'ABERTA', supply: null, available: 500, maxPerOrder: 20, price: money(b.times(0.5)) },
  ]
}

export function buildNftFixtures(): NftRecord[] {
  const rand = mulberry32(20260729)
  const categories: Category[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos', 'assinaturas', 'utilidade']
  const networks: Network[] = ['ethereum', 'polygon', 'solana']
  const records: NftRecord[] = []

  for (let i = 0; i < TOTAL_NFTS; i++) {
    const design = DESIGN_ITEMS[i]
    let name: string
    let token: string
    let price: string
    let image: string
    if (design) {
      name = design.name
      token = design.token
      price = design.price
      image = IMAGES[design.image]
    } else {
      const [noun, img] = NOUNS[i % NOUNS.length]
      name = `${ADJECTIVES[i % ADJECTIVES.length]} ${noun}`
      token = String(100 + Math.floor(rand() * 899)).padStart(3, '0')
      price = (0.02 + rand() * 12.28).toFixed(2)
      image = IMAGES[img]
    }
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${token}`
    const editions = buildEditions(price, rand, i)
    // Um NFT totalmente esgotado para exercitar o estado "indisponível"
    if (i === 10) editions.forEach((e) => (e.available = 0))
    const attrs = [ATTRIBUTES[i % ATTRIBUTES.length], ATTRIBUTES[(i + 3) % ATTRIBUTES.length], i % 4 === 0 ? 'Raro' : 'Comum']

    records.push({
      id,
      name: `${name} #${token}`,
      tokenId: `#${token.padStart(4, '0')}`,
      image,
      category: design ? categories[i % 3] : categories[Math.floor(rand() * categories.length)],
      network: i < 6 ? 'ethereum' : networks[Math.floor(rand() * networks.length)],
      compareAtPrice: design?.compareAt ?? null,
      badge: design?.badge ?? (i % 11 === 5 ? 'RARO' : null),
      listedAt: new Date(BASE_DATE - i * 36 * 3600_000).toISOString(),
      popularity: Math.floor(rand() * 1000),
      collection: i % 2 === 0 ? 'Kurio Apes' : 'Kurio Editions',
      description: `Um colecionável digital finalizado à mão da coleção ${i % 2 === 0 ? 'Kurio Apes' : 'Kurio Editions'}, verificado na ${
        i < 6 ? 'Ethereum' : 'rede'
      }, com arte desbloqueável e acesso para colecionadores.`,
      attributes: Array.from(new Set(attrs)),
      rating: 4 + Math.round(rand() * 10) / 10,
      reviewsCount: 3 + Math.floor(rand() * 30),
      contractAddress: `0x7A42${Math.floor(rand() * 1e12).toString(16).padStart(12, '0')}${'0'.repeat(18)}19E8`.slice(0, 42),
      royaltyPct: 5,
      editions,
      defaultEditionId: 'ed-1-50',
      featured: i < 3,
      version: 1,
    })
  }
  return records
}

export function buildReviews(nftId: string, count: number): NftReview[] {
  const rand = mulberry32(nftId.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const authors = ['ana.eth', 'bruno_cripto', 'carla.art', 'dudu.nft', 'eli.collector', 'fefe.eth']
  const comments = [
    'Arte impecável, a textura em alta resolução é incrível.',
    'Entrega rápida na carteira e procedência verificada.',
    'Uma das melhores peças da coleção. Recomendo!',
    'Ótimo custo-benefício para a edição 1/50.',
    'Os atributos raros valorizam muito a peça.',
  ]
  return Array.from({ length: Math.min(count, 5) }, (_, i) => ({
    id: `${nftId}-r${i}`,
    author: authors[Math.floor(rand() * authors.length)],
    rating: 4 + Math.round(rand()),
    comment: comments[i % comments.length],
    createdAt: new Date(BASE_DATE - (i + 1) * 86_400_000).toISOString(),
  }))
}
