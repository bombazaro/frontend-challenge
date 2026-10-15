import type { CatalogSort, CatalogTab, Category, Network, OrderStatus, WalletProvider } from '@/contracts/api'

export const CATEGORY_LABELS: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const NETWORK_LABELS: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

export const TAB_LABELS: Record<CatalogTab, string> = { todos: 'Todos os NFTs', novos: 'Novos lançamentos', 'em-alta': 'Em alta' }

export const SORT_LABELS: Record<CatalogSort, string> = {
  recentes: 'Listados recentemente',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  populares: 'Mais populares',
}

export const PROVIDER_LABELS: Record<WalletProvider, string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { pending: 'Pendente', confirmed: 'Confirmado', refused: 'Recusado' }
