import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FavoritesResponse } from '@/contracts/api'
import { favoritesApi } from '@/api/favorites'
import { qk } from '@/api/keys'
import { errorMessage } from '@/lib/api-error'
import { useSession } from './session'

export function useFavorites() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.favorites(user?.id ?? 'anon'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: Boolean(user),
  })
}

/** Atualização otimista com rollback em caso de falha. */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = qk.favorites(user?.id ?? 'anon')

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(`Não foi possível atualizar os favoritos. ${errorMessage(error)}`)
    },
    onSuccess: (_data, { favorite }) => {
      toast.success(favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
