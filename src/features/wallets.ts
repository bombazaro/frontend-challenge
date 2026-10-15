import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Network, UpsertWalletRequest, Wallet } from '@/contracts/api'
import { walletsApi } from '@/api/wallets'
import { qk } from '@/api/keys'
import { useSession } from './session'

export function useWallets() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.wallets(user?.id ?? 'anon'),
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled: Boolean(user),
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: UpsertWalletRequest }) => (id ? walletsApi.update(id, body) : walletsApi.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.wallets(user?.id ?? 'anon') }),
  })
}

/** Conexão simulada: o estado oficial fica no servidor (connectedNetwork). */
export function useWalletConnection() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = qk.wallets(user?.id ?? 'anon')
  const setConnected = (walletId: string, network: Network | null) =>
    queryClient.setQueryData<Wallet[]>(key, (old) => old?.map((w) => ({ ...w, connectedNetwork: w.id === walletId ? network : w.connectedNetwork })))

  const connect = useMutation({
    mutationFn: ({ walletId, network }: { walletId: string; network: Network }) => walletsApi.connect(walletId, network),
    onSuccess: (conn) => setConnected(conn.walletId, conn.network),
  })
  const disconnect = useMutation({
    mutationFn: (walletId: string) => walletsApi.disconnect(walletId),
    onSuccess: (_d, walletId) => setConnected(walletId, null),
  })
  return { connect, disconnect }
}
