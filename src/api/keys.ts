import type { Network, NftListParams } from '@/contracts/api'

/**
 * Fábrica de query keys.
 * - Dados públicos: ['nfts', ...]
 * - Dados privados: ['user', userId, ...] -> isolados por usuário e removidos no logout.
 * - Carrinho/cotação: escopo pelo dono ('user:<id>' ou 'guest:<cartId>').
 */
export const qk = {
  session: ['session'] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    details: ['nfts', 'detail'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    reviews: (id: string) => ['nfts', 'reviews', id] as const,
  },
  cart: (owner: string) => ['cart', owner] as const,
  quotes: (owner: string) => ['quote', owner] as const,
  quote: (owner: string, network: Network, revision: number) => ['quote', owner, network, revision] as const,
  user: (userId: string) => ['user', userId] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  orders: (userId: string) => ['user', userId, 'orders'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
}
