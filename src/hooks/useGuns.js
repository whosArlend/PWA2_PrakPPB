import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// useGuns — query caching for products catalog (FEATURE 4)
// ---------------------------------------------------------------------------
export function useGuns(params = {}) {
  const query = useQuery({
    queryKey: ['guns', params],
    queryFn: async () => {
      const response = await gunService.getGuns(params)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch products')
      }
      return response
    },
  })

  return {
    guns: query.data?.data || [],
    pagination: query.data?.pagination || null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useGunById — query caching for single product detail (FEATURE 4)
// ---------------------------------------------------------------------------
export function useGunById(id) {
  const query = useQuery({
    queryKey: ['gun', String(id)],
    queryFn: async () => {
      if (!id) return null
      const res = await gunService.getGunById(id)
      if (!res.success) throw new Error(res.message || 'Product not found')
      return res.data
    },
    enabled: Boolean(id),
  })

  return {
    gun: query.data || null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// Product Mutations with automatic React Query Cache Invalidation (FEATURE 4)
// ---------------------------------------------------------------------------
export function useProductMutations() {
  const queryClient = useQueryClient()

  const invalidateGuns = () => {
    queryClient.invalidateQueries({ queryKey: ['guns'] })
  }

  const createMutation = useMutation({
    mutationFn: (data) => gunService.createGun(data),
    onSuccess: () => invalidateGuns(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => gunService.updateGun(id, data),
    onSuccess: (_, vars) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: ['gun', String(vars.id)] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id) => gunService.archiveGun(id),
    onSuccess: (_, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: ['gun', String(id)] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id) => gunService.restoreGun(id),
    onSuccess: (_, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: ['gun', String(id)] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => gunService.deleteGun(id),
    onSuccess: (_, id) => {
      invalidateGuns()
      queryClient.removeQueries({ queryKey: ['gun', String(id)] })
    },
  })

  const publishDraftMutation = useMutation({
    mutationFn: (id) => gunService.publishDraft(id),
    onSuccess: (_, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: ['gun', String(id)] })
    },
  })

  return {
    createGun: createMutation.mutateAsync,
    updateGun: updateMutation.mutateAsync,
    archiveGun: archiveMutation.mutateAsync,
    restoreGun: restoreMutation.mutateAsync,
    deleteGun: deleteMutation.mutateAsync,
    publishDraft: publishDraftMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending ||
      restoreMutation.isPending ||
      deleteMutation.isPending,
  }
}
