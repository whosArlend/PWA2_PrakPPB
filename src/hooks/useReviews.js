import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import reviewService from '../services/reviewService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// useReviews — query caching for product reviews (FEATURE 4 & FEATURE 8)
// ---------------------------------------------------------------------------
export function useReviews(gunId) {
  const query = useQuery({
    queryKey: ['reviews', String(gunId)],
    queryFn: async () => {
      if (!gunId) return []
      const response = await reviewService.getReviews(gunId)
      if (!response.success) throw new Error(response.message || 'Failed to fetch reviews')
      return response.data || []
    },
    enabled: Boolean(gunId),
  })

  return {
    reviews: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — mutation to create review with cache invalidation
// ---------------------------------------------------------------------------
export function useCreateReview() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ gunId, reviewData }) => reviewService.createReview(gunId, reviewData),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', String(vars.gunId)] })
    },
  })

  const createReview = async (gunId, reviewData) => {
    try {
      const res = await mutation.mutateAsync({ gunId, reviewData })
      return res.data
    } catch {
      return null
    }
  }

  return {
    createReview,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    success: mutation.isSuccess,
  }
}

// ---------------------------------------------------------------------------
// useReviewMutations — full CRUD & Thumbs Up/Down (FEATURE 8)
// ---------------------------------------------------------------------------
export function useReviewMutations(gunId) {
  const queryClient = useQueryClient()
  const currentUserId = getUserIdentifier()

  const invalidate = () => {
    if (gunId) {
      queryClient.invalidateQueries({ queryKey: ['reviews', String(gunId)] })
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, data }) => reviewService.updateReview(reviewId, data),
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (reviewId) => reviewService.deleteReview(reviewId),
    onSuccess: () => invalidate(),
  })

  const voteMutation = useMutation({
    mutationFn: ({ reviewId, voteType }) => reviewService.voteReview(reviewId, voteType),
    onSuccess: () => invalidate(),
  })

  return {
    updateReview: updateMutation.mutateAsync,
    deleteReview: deleteMutation.mutateAsync,
    voteReview: voteMutation.mutateAsync,
    currentUserId,
    isMutating: updateMutation.isPending || deleteMutation.isPending || voteMutation.isPending,
  }
}
