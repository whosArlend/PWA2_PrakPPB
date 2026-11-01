import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// useFavorites — query caching for favorites list (FEATURE 4)
// ---------------------------------------------------------------------------
export function useFavorites() {
  const userIdentifier = getUserIdentifier()

  const query = useQuery({
    queryKey: ['favorites', userIdentifier],
    queryFn: async () => {
      const response = await favoriteService.getFavorites(userIdentifier)
      if (!response.success) throw new Error(response.message || 'Failed to fetch favorites')
      return response.data || []
    },
  })

  return {
    favorites: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    isLocal: false,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — mutation with cache invalidation (FEATURE 4)
// ---------------------------------------------------------------------------
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const userIdentifier = getUserIdentifier()

  const mutation = useMutation({
    mutationFn: (gunId) =>
      favoriteService.toggleFavorite({
        recipe_id: gunId,
        user_identifier: userIdentifier,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userIdentifier] })
    },
  })

  return {
    toggleFavorite: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
  }
}

// ---------------------------------------------------------------------------
// useIsFavorited — check single product favorite status
// ---------------------------------------------------------------------------
export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  const isFavorited = favorites.some((fav) => {
    const favId = typeof fav === 'object' && fav !== null ? fav.id ?? fav.product_id : fav
    return String(favId) === String(gunId)
  })

  const toggleFavorite = async () => {
    return toggle(gunId)
  }

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite,
  }
}

export { getUserIdentifier }
