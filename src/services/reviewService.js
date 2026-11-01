import { apiClient, IS_SUPABASE } from '../config/api'
import { getUserIdentifier } from './userService'

const LOCAL_REVIEWS_KEY = 'bore_barrel_reviews_store'
const LOCAL_VOTES_KEY = 'bore_barrel_review_votes_store'

// ---------------------------------------------------------------------------
// Local Persistent Storage Helpers
// ---------------------------------------------------------------------------
const getStoredReviews = () => {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveStoredReviews = (reviews) => {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews))
    window.dispatchEvent(new Event('reviews-updated'))
    return true
  } catch {
    return false
  }
}

const getStoredVotes = () => {
  try {
    const raw = localStorage.getItem(LOCAL_VOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveStoredVotes = (votes) => {
  try {
    localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(votes))
    window.dispatchEvent(new Event('review-votes-updated'))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// ReviewService — Review CRUD & Thumbs Up/Down Reactions (FEATURE 8)
// ---------------------------------------------------------------------------
class ReviewService {
  /**
   * Fetch all reviews for a given product with votes and current user's reaction.
   */
  async getReviews(gunId) {
    const currentUserId = getUserIdentifier()
    const targetGunId = String(gunId)

    if (IS_SUPABASE) {
      try {
        const data = await apiClient.get(
          `/rest/v1/reviews?product_id=eq.${targetGunId}&select=*,review_votes(id,user_id,vote_type)&order=created_at.desc`,
        )

        if (Array.isArray(data)) {
          const formatted = data.map((r) => {
            const votes = r.review_votes || []
            const upvotes = votes.filter((v) => v.vote_type === 'up').length
            const downvotes = votes.filter((v) => v.vote_type === 'down').length
            const myVoteObj = votes.find((v) => v.user_id === currentUserId)

            return {
              id: r.id,
              product_id: r.product_id,
              user_id: r.user_id,
              user_identifier: r.user_id
                ? r.user_id === currentUserId
                  ? 'You (Operator)'
                  : `Operator ${String(r.user_id).substring(0, 8)}`
                : 'Anonymous',
              rating: Number(r.rating),
              comment: r.content || r.comment || '',
              content: r.content || r.comment || '',
              created_at: r.created_at,
              updated_at: r.updated_at,
              upvotes,
              downvotes,
              userVote: myVoteObj ? myVoteObj.vote_type : null,
            }
          })

          return { success: true, data: formatted }
        }
      } catch (err) {
        console.warn('Supabase getReviews failed, using local store:', err)
      }
    }

    // Local Storage flow
    const allReviews = getStoredReviews()
    const allVotes = getStoredVotes()

    const productReviews = allReviews
      .filter((r) => String(r.product_id) === targetGunId)
      .map((r) => {
        const reviewVotes = allVotes.filter((v) => String(v.review_id) === String(r.id))
        const upvotes = reviewVotes.filter((v) => v.vote_type === 'up').length
        const downvotes = reviewVotes.filter((v) => v.vote_type === 'down').length
        const myVote = reviewVotes.find((v) => v.user_id === currentUserId)

        return {
          ...r,
          user_identifier:
            r.user_id === currentUserId
              ? 'You (Operator)'
              : `Operator ${String(r.user_id || '').substring(0, 8)}`,
          upvotes,
          downvotes,
          userVote: myVote ? myVote.vote_type : null,
        }
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return { success: true, data: productReviews }
  }

  /**
   * Submit a new review.
   * @param {string|number} gunId
   * @param {Object} reviewData  { rating, content, user_id }
   */
  async createReview(gunId, reviewData) {
    const currentUserId = reviewData.user_id || getUserIdentifier()
    const rating = Math.min(5, Math.max(1, Number(reviewData.rating) || 5))
    const content = (reviewData.content || reviewData.comment || '').trim()

    const payload = {
      product_id: Number(gunId) || gunId,
      user_id: currentUserId,
      rating,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (IS_SUPABASE) {
      try {
        const res = await apiClient.post('/rest/v1/reviews', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = Array.isArray(res) ? res[0] : res
        return {
          success: true,
          data: {
            ...created,
            user_identifier: 'You (Operator)',
            upvotes: 0,
            downvotes: 0,
            userVote: null,
          },
        }
      } catch (err) {
        console.warn('Supabase createReview error, falling back locally:', err)
      }
    }

    // Local Storage save
    const all = getStoredReviews()
    const newRecord = {
      ...payload,
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_identifier: 'You (Operator)',
      upvotes: 0,
      downvotes: 0,
      userVote: null,
    }
    all.unshift(newRecord)
    saveStoredReviews(all)

    return { success: true, data: newRecord }
  }

  /**
   * Edit an existing review (author only).
   */
  async updateReview(reviewId, updateData) {
    const rating = Math.min(5, Math.max(1, Number(updateData.rating) || 5))
    const content = (updateData.content || updateData.comment || '').trim()
    const currentUserId = getUserIdentifier()

    if (IS_SUPABASE) {
      try {
        const res = await apiClient.patch(
          `/rest/v1/reviews?id=eq.${reviewId}&user_id=eq.${currentUserId}`,
          {
            rating,
            content,
            updated_at: new Date().toISOString(),
          },
          { headers: { Prefer: 'return=representation' } },
        )
        const updated = Array.isArray(res) ? res[0] : res
        return { success: true, data: updated }
      } catch (err) {
        console.warn('Supabase updateReview error:', err)
      }
    }

    // Local Storage update
    const all = getStoredReviews()
    const index = all.findIndex((r) => String(r.id) === String(reviewId))
    if (index > -1) {
      if (all[index].user_id && all[index].user_id !== currentUserId) {
        throw new Error('Unauthorized: You cannot edit another user\'s review.')
      }
      all[index].rating = rating
      all[index].content = content
      all[index].comment = content
      all[index].updated_at = new Date().toISOString()
      saveStoredReviews(all)
      return { success: true, data: all[index] }
    }

    throw new Error('Review not found.')
  }

  /**
   * Delete an existing review (author only).
   */
  async deleteReview(reviewId) {
    const currentUserId = getUserIdentifier()

    if (IS_SUPABASE) {
      try {
        await apiClient.delete(
          `/rest/v1/reviews?id=eq.${reviewId}&user_id=eq.${currentUserId}`,
        )
      } catch (err) {
        console.warn('Supabase deleteReview error:', err)
      }
    }

    const all = getStoredReviews()
    const target = all.find((r) => String(r.id) === String(reviewId))
    if (target && target.user_id && target.user_id !== currentUserId) {
      throw new Error('Unauthorized: You cannot delete another user\'s review.')
    }
    const filtered = all.filter((r) => String(r.id) !== String(reviewId))
    saveStoredReviews(filtered)

    // Also clean up votes
    const votes = getStoredVotes()
    const cleanVotes = votes.filter((v) => String(v.review_id) !== String(reviewId))
    saveStoredVotes(cleanVotes)

    return { success: true }
  }

  /**
   * Cast, change, or remove a thumbs-up or thumbs-down vote on a review.
   * @param {string|number} reviewId
   * @param {'up'|'down'} voteType
   * @returns {Promise<{ success: boolean, data: { userVote: string|null } }>}
   */
  async voteReview(reviewId, voteType) {
    const currentUserId = getUserIdentifier()
    const revId = String(reviewId)

    if (IS_SUPABASE) {
      try {
        // Check existing vote
        const existing = await apiClient.get(
          `/rest/v1/review_votes?review_id=eq.${revId}&user_id=eq.${currentUserId}&select=*`,
        )

        if (Array.isArray(existing) && existing.length > 0) {
          const currentVote = existing[0]
          if (currentVote.vote_type === voteType) {
            // Remove vote (toggle off)
            await apiClient.delete(
              `/rest/v1/review_votes?review_id=eq.${revId}&user_id=eq.${currentUserId}`,
            )
            return { success: true, data: { userVote: null } }
          } else {
            // Change vote
            await apiClient.patch(
              `/rest/v1/review_votes?review_id=eq.${revId}&user_id=eq.${currentUserId}`,
              { vote_type: voteType },
            )
            return { success: true, data: { userVote: voteType } }
          }
        } else {
          // Insert new vote
          await apiClient.post(
            '/rest/v1/review_votes',
            {
              review_id: Number(reviewId) || reviewId,
              user_id: currentUserId,
              vote_type: voteType,
            },
            { headers: { Prefer: 'return=minimal' } },
          )
          return { success: true, data: { userVote: voteType } }
        }
      } catch (err) {
        console.warn('Supabase voteReview error, voting locally:', err)
      }
    }

    // Local Storage voting
    const votes = getStoredVotes()
    const existingIndex = votes.findIndex(
      (v) => String(v.review_id) === revId && v.user_id === currentUserId,
    )

    let resultingVote = null

    if (existingIndex > -1) {
      if (votes[existingIndex].vote_type === voteType) {
        // Toggle off
        votes.splice(existingIndex, 1)
        resultingVote = null
      } else {
        // Switch vote
        votes[existingIndex].vote_type = voteType
        resultingVote = voteType
      }
    } else {
      // Add vote
      votes.push({
        id: `vote-${Date.now()}`,
        review_id: revId,
        user_id: currentUserId,
        vote_type: voteType,
        created_at: new Date().toISOString(),
      })
      resultingVote = voteType
    }

    saveStoredVotes(votes)
    return { success: true, data: { userVote: resultingVote } }
  }
}

export default new ReviewService()
