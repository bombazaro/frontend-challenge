import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tokenStore } from '@/lib/http'
import { formatEth } from '@/lib/money'
import { useSession } from '@/features/session'
import { createSocket } from './socket'
import { EventGuard } from './event-guard'
import { applyNftUpdated, applyOrderUpdated } from './apply-events'
import { announce } from './announcer'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting'

const RealtimeContext = createContext<RealtimeStatus>('connecting')

export function useRealtimeStatus() {
  return useContext(RealtimeContext)
}

/**
 * Um socket por sessão. Ao trocar de usuário (login/logout) o socket anterior é encerrado,
 * todos os listeners são removidos e o guard de eventos é descartado.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { user, isReady } = useSession()
  const userId = user?.id ?? null
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!isReady) return
    const socket = createSocket(userId ? tokenStore.get() : null)
    const guard = new EventGuard()
    let connectedBefore = false

    socket.on('connect', () => {
      setStatus('connected')
      if (connectedBefore) {
        // Reconciliação após reconexão: recursos ativos voltam a ser lidos do REST
        queryClient.invalidateQueries({ queryKey: ['nfts'] })
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        queryClient.invalidateQueries({ queryKey: ['quote'] })
        if (userId) queryClient.invalidateQueries({ queryKey: ['user', userId, 'orders'] })
      }
      connectedBefore = true
    })
    socket.on('disconnect', () => setStatus('reconnecting'))
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'))

    socket.on('nft.updated', (event) => {
      if (!guard.accept(event)) return
      const inCart = applyNftUpdated(queryClient, event)
      if (inCart) {
        const msg = `${event.data.name} foi atualizado: ${event.data.soldOut ? 'esgotado' : `agora ${formatEth(event.data.price)}`}.`
        toast.info(msg)
        announce(msg)
      }
    })

    socket.on('order.updated', (event) => {
      if (!userId || !guard.accept(event)) return
      if (!applyOrderUpdated(queryClient, event, userId)) return
      const msg = event.data.status === 'confirmed' ? 'Pagamento confirmado! Seus NFTs estão na sua carteira.' : 'Pagamento recusado.'
      announce(msg)
    })

    return () => {
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
      guard.reset()
    }
  }, [isReady, userId, queryClient])

  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>
}
