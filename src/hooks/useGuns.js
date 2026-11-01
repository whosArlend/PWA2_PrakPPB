import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// Standard Query Keys (FEATURE 4)
// ---------------------------------------------------------------------------
export const gunKeys = {
  all: ['guns'],
  lists: () => [...gunKeys.all, 'list'],
  list: (params = {}) => [...gunKeys.lists(), { status: params.status || 'published', limit: params.limit || 100 }],
  details: () => [...gunKeys.all, 'detail'],
  detail: (id) => [...gunKeys.details(), String(id)],
  drafts: () => [...gunKeys.all, 'drafts'],
  archived: () => [...gunKeys.all, 'archived'],
}

// ---------------------------------------------------------------------------
// useGuns — query caching for products catalog (FEATURE 4)
// ---------------------------------------------------------------------------
export function useGuns(params = {}) {
  const queryKey = gunKeys.list(params)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('%c[TanStack Query] Fetching catalog:', 'color: #a67c2e; font-weight: bold', queryKey)
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
  const queryKey = gunKeys.detail(id)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!id) return null
      console.log('%c[TanStack Query] Fetching product detail:', 'color: #a67c2e; font-weight: bold', queryKey)
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
// useDraftGuns & useArchivedGuns — query caching for management views
// ---------------------------------------------------------------------------
export function useDraftGuns() {
  const query = useQuery({
    queryKey: gunKeys.drafts(),
    queryFn: async () => {
      console.log('%c[TanStack Query] Fetching drafts:', 'color: #a67c2e; font-weight: bold')
      const res = await gunService.getDraftGuns()
      return res.data || []
    },
  })

  return {
    drafts: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}

export function useArchivedGuns() {
  const query = useQuery({
    queryKey: gunKeys.archived(),
    queryFn: async () => {
      console.log('%c[TanStack Query] Fetching archived hardware:', 'color: #a67c2e; font-weight: bold')
      const res = await gunService.getArchivedGuns()
      return res.data || []
    },
  })

  return {
    archived: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// Product Mutations with automatic React Query Cache Invalidation (FEATURE 4)
// ---------------------------------------------------------------------------
export function useProductMutations() {
  const queryClient = useQueryClient()

  const invalidateGuns = () => {
    console.log('%c[TanStack Query] Invalidation triggered for all gun queries', 'color: #dc2626; font-weight: bold')
    queryClient.invalidateQueries({ queryKey: gunKeys.all })
  }

  const createMutation = useMutation({
    mutationFn: (data) => gunService.createGun(data),
    onSuccess: (res) => {
      invalidateGuns()
      return res
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => gunService.updateGun(id, data),
    onSuccess: (res, vars) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: gunKeys.detail(vars.id) })
      return res
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id) => gunService.archiveGun(id),
    onSuccess: (res, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: gunKeys.detail(id) })
      return res
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id) => gunService.restoreGun(id),
    onSuccess: (res, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: gunKeys.detail(id) })
      return res
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => gunService.deleteGun(id),
    onSuccess: (res, id) => {
      invalidateGuns()
      queryClient.removeQueries({ queryKey: gunKeys.detail(id) })
      return res
    },
  })

  const publishDraftMutation = useMutation({
    mutationFn: (id) => gunService.publishDraft(id),
    onSuccess: (res, id) => {
      invalidateGuns()
      queryClient.invalidateQueries({ queryKey: gunKeys.detail(id) })
      return res
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
      deleteMutation.isPending ||
      publishDraftMutation.isPending,
  }
}
