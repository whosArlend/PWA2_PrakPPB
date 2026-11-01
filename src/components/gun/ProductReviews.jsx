import { useState } from 'react'
import {
  Star,
  Send,
  Loader,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useReviews, useCreateReview, useReviewMutations } from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'

/**
 * ProductReviews Component (FEATURE 8: Review CRUD & Thumbs Up/Down)
 */
export default function ProductReviews({ gunId, gunName }) {
  const currentUserId = getUserIdentifier()
  const { reviews, loading: reviewsLoading, refetch } = useReviews(gunId)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, deleteReview, voteReview, isMutating } = useReviewMutations(gunId)

  // New review form state
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Edit review state
  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState('')

  // Delete review state
  const [deleteTargetId, setDeleteTargetId] = useState(null)

  // Local optimistic vote state map { reviewId: { upvotes, downvotes, userVote } }
  const [optimisticVotes, setOptimisticVotes] = useState({})

  // Submit new review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    if (!content.trim()) {
      setReviewError('Please write a brief evaluation or comment.')
      return
    }

    try {
      const result = await createReview(gunId, {
        user_id: currentUserId,
        rating,
        content: content.trim(),
      })

      if (result) {
        setReviewSuccess('Evaluation registered successfully.')
        setContent('')
        setRating(5)
        refetch()
        setTimeout(() => setReviewSuccess(''), 3000)
      } else {
        setReviewError('Could not submit review.')
      }
    } catch (err) {
      setReviewError(err.message || 'Error submitting review.')
    }
  }

  // Start editing
  const startEdit = (rev) => {
    setEditingId(rev.id)
    setEditRating(rev.rating)
    setEditContent(rev.content || rev.comment || '')
    setEditError('')
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditRating(5)
    setEditContent('')
    setEditError('')
  }

  // Save edited review
  const handleSaveEdit = async (reviewId) => {
    if (editRating < 1 || editRating > 5) {
      setEditError('Rating must be between 1 and 5.')
      return
    }

    try {
      await updateReview({
        reviewId,
        data: {
          rating: editRating,
          content: editContent.trim(),
        },
      })
      setEditingId(null)
      refetch()
    } catch (err) {
      setEditError(err.message || 'Failed to update review.')
    }
  }

  // Confirm delete
  const handleDelete = async (reviewId) => {
    try {
      await deleteReview(reviewId)
      setDeleteTargetId(null)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to delete review.')
    }
  }

  // Vote reaction with optimistic UI
  const handleVote = async (rev, type) => {
    const revId = rev.id
    const currentOpt = optimisticVotes[revId] || {
      upvotes: rev.upvotes || 0,
      downvotes: rev.downvotes || 0,
      userVote: rev.userVote || null,
    }

    let nextUp = currentOpt.upvotes
    let nextDown = currentOpt.downvotes
    let nextUserVote = type

    if (currentOpt.userVote === type) {
      // Toggle off
      nextUserVote = null
      if (type === 'up') nextUp = Math.max(0, nextUp - 1)
      if (type === 'down') nextDown = Math.max(0, nextDown - 1)
    } else {
      if (currentOpt.userVote === 'up') nextUp = Math.max(0, nextUp - 1)
      if (currentOpt.userVote === 'down') nextDown = Math.max(0, nextDown - 1)

      if (type === 'up') nextUp += 1
      if (type === 'down') nextDown += 1
    }

    // Apply immediate optimistic state
    setOptimisticVotes((prev) => ({
      ...prev,
      [revId]: {
        upvotes: nextUp,
        downvotes: nextDown,
        userVote: nextUserVote,
      },
    }))

    try {
      await voteReview({ reviewId: revId, voteType: type })
      refetch()
    } catch (err) {
      console.warn('Vote failed, reverting:', err)
      // Revert optimistic on failure
      setOptimisticVotes((prev) => {
        const copy = { ...prev }
        delete copy[revId]
        return copy
      })
    }
  }

  return (
    <section className="detail-section reviews-section">
      <div className="section-header-row">
        <div>
          <h2>Armory Field Reports &amp; Reviews</h2>
          <p className="section-sub">
            Authentic operator feedback and reliability ratings for {gunName || 'this hardware'}.
          </p>
        </div>
      </div>

      {/* Review Submission Form */}
      <form className="review-form card-box" onSubmit={handleSubmitReview}>
        <h3 className="card-box-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
          File Operator Report
        </h3>

        <div className="review-rating-select">
          <span className="form-label" style={{ marginBottom: 0 }}>Rating:</span>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="review-input form-textarea"
          rows="3"
          placeholder="Detail performance, ergonomics, recoil impulse, and field reliability..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
        />

        <div className="review-form-footer">
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={submitting || !gunId}
          >
            {submitting ? (
              <><Loader size={15} className="spin" /> Filing Report…</>
            ) : (
              <><Send size={15} /> Submit Evaluation</>
            )}
          </button>
        </div>

        {reviewError && <p className="form-error">{reviewError}</p>}
        {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
      </form>

      {/* Review List */}
      {reviewsLoading ? (
        <div className="state-box" style={{ padding: '24px' }}>
          <Loader size={24} className="spin" />
          <p>Retrieving field reports…</p>
        </div>
      ) : reviews.length > 0 ? (
        <ul className="review-list">
          {reviews.map((rev) => {
            const isOwner = rev.user_id && rev.user_id === currentUserId
            const isEditing = editingId === rev.id
            const votesData = optimisticVotes[rev.id] || {
              upvotes: rev.upvotes || 0,
              downvotes: rev.downvotes || 0,
              userVote: rev.userVote || null,
            }

            return (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <div className="review-meta">
                    <span className="review-user">{rev.user_identifier}</span>
                    <span className="review-date">
                      {rev.created_at
                        ? new Date(rev.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                  </div>

                  <div className="review-head-right">
                    <span className="review-stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < rev.rating ? 'var(--brass)' : 'none'}
                          stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                        />
                      ))}
                    </span>

                    {/* Owner actions: Edit & Delete */}
                    {isOwner && !isEditing && (
                      <div className="review-owner-actions">
                        <button
                          type="button"
                          className="icon-btn-subtle"
                          onClick={() => startEdit(rev)}
                          title="Edit your review"
                          aria-label="Edit review"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn-subtle icon-btn-subtle--danger"
                          onClick={() => setDeleteTargetId(rev.id)}
                          title="Delete your review"
                          aria-label="Delete review"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing ? (
                  <div className="review-edit-box">
                    <div className="review-stars" style={{ marginBottom: '8px' }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="star-btn"
                          onClick={() => setEditRating(n)}
                        >
                          <Star
                            size={18}
                            fill={n <= editRating ? 'var(--brass)' : 'none'}
                            stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    {editError && <p className="form-error">{editError}</p>}
                    <div className="review-edit-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleSaveEdit(rev.id)}
                        disabled={isMutating}
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={cancelEdit}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="review-comment">{rev.content || rev.comment}</p>
                )}

                {/* Delete Confirmation Inline */}
                {deleteTargetId === rev.id && (
                  <div className="review-delete-confirm">
                    <span>Delete your review permanently?</span>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => handleDelete(rev.id)}
                      disabled={isMutating}
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => setDeleteTargetId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Reactions Row (FEATURE 8: Thumbs Up / Down) */}
                <div className="review-reactions-row">
                  <span className="reaction-label">Helpful report?</span>
                  <div className="reaction-buttons">
                    <button
                      type="button"
                      className={`reaction-btn ${votesData.userVote === 'up' ? 'reaction-btn--active' : ''}`}
                      onClick={() => handleVote(rev, 'up')}
                      title="Mark as helpful (Thumbs Up)"
                      aria-label="Thumbs up"
                    >
                      <ThumbsUp size={14} />
                      <span className="reaction-count">{votesData.upvotes}</span>
                    </button>

                    <button
                      type="button"
                      className={`reaction-btn ${votesData.userVote === 'down' ? 'reaction-btn--active-down' : ''}`}
                      onClick={() => handleVote(rev, 'down')}
                      title="Mark as unhelpful (Thumbs Down)"
                      aria-label="Thumbs down"
                    >
                      <ThumbsDown size={14} />
                      <span className="reaction-count">{votesData.downvotes}</span>
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="state-box" style={{ padding: '24px' }}>
          <AlertCircle size={24} stroke="var(--steel)" />
          <p>No operator evaluations filed yet. Be the first to evaluate this hardware.</p>
        </div>
      )}
    </section>
  )
}

