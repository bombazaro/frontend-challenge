/**
 * Contratos REST e de tempo real compartilhados entre a aplicação e a camada de mocks.
 * Valores em ETH trafegam SEMPRE como string decimal ("1.19"). Quantidades são inteiras.
 */

export type DecimalString = string
export type ISODate = string

// ---------- Erros ----------
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'ADDRESS_TAKEN'
  | 'INVALID_PASSWORD'
  | 'EDITION_UNAVAILABLE'
  | 'QUANTITY_LIMIT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'QUOTE_STALE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_REJECTED'
  | 'WALLET_NOT_CONNECTED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string>
    details?: unknown
  }
}

// ---------- Sessão e conta ----------
export interface User {
  id: string
  username: string
  displayName: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  createdAt: ISODate
}

export interface Session {
  user: User
  expiresAt: ISODate
}

export interface AuthResponse {
  token: string
  session: Session
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// ---------- NFTs ----------
export const CATEGORIES = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export type Category = (typeof CATEGORIES)[number]

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export type Network = (typeof NETWORKS)[number]

export const CATALOG_TABS = ['todos', 'novos', 'em-alta'] as const
export type CatalogTab = (typeof CATALOG_TABS)[number]

export const CATALOG_SORTS = ['recentes', 'menor-preco', 'maior-preco', 'populares'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

export interface Edition {
  id: string
  label: string
  /** null = edição aberta */
  supply: number | null
  available: number
  maxPerOrder: number
  price: DecimalString
}

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  image: string
  category: Category
  network: Network
  price: DecimalString
  compareAtPrice: DecimalString | null
  badge: string | null
  soldOut: boolean
  listedAt: ISODate
  version: number
}

export interface Nft extends NftSummary {
  collection: string
  description: string
  details: string[]
  attributes: string[]
  gallery: string[]
  rating: number
  reviewsCount: number
  contractAddress: string
  royaltyPct: number
  editions: Edition[]
  defaultEditionId: string
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: ISODate
}

export interface NftListParams {
  q?: string
  category?: Category[]
  network?: Network[]
  minPrice?: string
  maxPrice?: string
  tab?: CatalogTab
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CatalogFacets {
  categories: Record<Category, number>
  networks: Record<Network, number>
  priceRange: { min: DecimalString; max: DecimalString }
}

export interface NftListResponse extends Paginated<NftSummary> {
  facets: CatalogFacets
}

// ---------- Favoritos ----------
export interface FavoritesResponse {
  nftIds: string[]
}

// ---------- Carrinho ----------
export interface CartItem {
  id: string
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  tokenId: string
  image: string
  quantity: number
  unitPrice: DecimalString
  lineTotal: DecimalString
  available: number
  maxQuantity: number
  /** Preço que o usuário viu ao adicionar/confirmar; diferente de unitPrice => preço mudou */
  acknowledgedPrice: DecimalString
  issue: 'price_changed' | 'sold_out' | 'quantity_reduced' | null
}

export interface AppliedCoupon {
  code: string
  description: string
}

export interface Cart {
  id: string
  owner: 'guest' | 'user'
  revision: number
  items: CartItem[]
  itemCount: number
  coupon: AppliedCoupon | null
  updatedAt: ISODate
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}

export interface MergeCartRequest {
  guestCartId: string
}

// ---------- Cotação ----------
export interface QuoteLine {
  cartItemId: string
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  tokenId: string
  image: string
  quantity: number
  unitPrice: DecimalString
  lineTotal: DecimalString
}

export interface QuoteIssue {
  type: 'price_changed' | 'sold_out' | 'quantity_reduced' | 'coupon_expired'
  cartItemId?: string
  message: string
}

export interface Quote {
  id: string
  cartRevision: number
  network: Network
  lines: QuoteLine[]
  subtotal: DecimalString
  discount: DecimalString
  networkFee: DecimalString
  total: DecimalString
  coupon: AppliedCoupon | null
  issues: QuoteIssue[]
  /** false quando há itens indisponíveis: não é possível finalizar */
  purchasable: boolean
  createdAt: ISODate
  expiresAt: ISODate
}

export interface QuoteRequest {
  network: Network
}

// ---------- Perfil ----------
export interface UpdateProfileRequest {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface AvatarRequest {
  /** data URL (image/png | image/jpeg | image/webp) — limite 1 MB */
  dataUrl: string | null
}

// ---------- Carteiras ----------
export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]
export type WalletRole = 'primary' | 'secondary'

export interface WalletInput {
  displayName: string
  nickname: string
  network: Network
  profileName: string
  address: string
  secondaryAddress: string
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
}

export interface Wallet extends WalletInput {
  id: string
  role: WalletRole
  /** Rede em que a carteira está conectada (simulação), ou null */
  connectedNetwork: Network | null
  createdAt: ISODate
  updatedAt: ISODate
}

export interface UpsertWalletRequest extends WalletInput {
  role: WalletRole
}

export interface WalletConnection {
  walletId: string
  network: Network
  status: 'connected'
  connectedAt: ISODate
}

// ---------- Pedidos ----------
export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export interface CollectorInfo {
  displayName: string
  username: string
  profileName: string
  email: string
  referralCode: string
  ensName: string
  note: string
}

export interface CreateOrderRequest {
  quoteId: string
  walletId: string
  network: Network
  collector: CollectorInfo
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  version: number
  createdAt: ISODate
  updatedAt: ISODate
  network: Network
  wallet: { id: string; provider: WalletProvider; address: string; label: string }
  collector: CollectorInfo
  lines: QuoteLine[]
  subtotal: DecimalString
  discount: DecimalString
  networkFee: DecimalString
  total: DecimalString
  couponCode: string | null
  txHash: string | null
  explorerUrl: string | null
  failureReason: string | null
}

// ---------- Tempo real (Socket.IO) ----------
export interface RealtimeEnvelope<TType extends string, TResource extends string, TData> {
  /** Identidade estável do evento (deduplicação) */
  eventId: string
  type: TType
  resource: { type: TResource; id: string }
  /** Versão do recurso após o evento (ordenação) */
  version: number
  occurredAt: ISODate
  data: TData
}

export interface NftUpdatedData {
  nftId: string
  name: string
  price: DecimalString
  soldOut: boolean
  editions: Pick<Edition, 'id' | 'price' | 'available'>[]
}

export interface OrderUpdatedData {
  orderId: string
  userId: string
  status: OrderStatus
  txHash: string | null
  failureReason: string | null
}

export type NftUpdatedEvent = RealtimeEnvelope<'nft.updated', 'nft', NftUpdatedData>
export type OrderUpdatedEvent = RealtimeEnvelope<'order.updated', 'order', OrderUpdatedData>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export type ClientToServerEvents = Record<string, never>
