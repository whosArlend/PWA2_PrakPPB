import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Share2,
  ShoppingCart,
  Check,
  Archive,
  Edit,
  Trash2,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ImageGallery from './ImageGallery'
import ProductReviews from './ProductReviews'
import { useCart } from '../../context/CartContext'
import { formatPrice, averageRating } from '../../utils/helpers'
import { useReviews } from '../../hooks/useReviews'

/**
 * Full-screen product detail view (FEATURES 1, 5, 8, 9)
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onBack    — return to catalog
 * @param {Function} [props.onEdit]  — navigate to edit page
 * @param {Function} [props.onDelete]— trigger soft-delete / archive flow
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete, onArchive }) {
  const { addToCart } = useCart()
  const { reviews } = useReviews(gun?.id)

  const [shareFeedback, setShareFeedback] = useState('')
  const [cartFeedback, setCartFeedback] = useState('')

  if (!gun) {
    return (
      <div className="state-box">
        <p>No hardware selected.</p>
        <button type="button" className="btn btn--outline" onClick={onBack}>
          <ArrowLeft size={16} /> Return to Armory Catalog
        </button>
      </div>
    )
  }

  const category = gun.type || gun.category || 'Hardware'
  const caliber = gun.caliber || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  // FEATURE 5: Share Product Through a Unique Link
  const handleShare = async () => {
    const origin = window.location.origin
    const shareUrl = `${origin}/product/${gun.id}`
    const shareData = {
      title: `${gun.name} — Bore & Barrel Armory`,
      text: `${gun.name} (${category} · ${caliber}) listed at ${formatPrice(price)}. Explore full specs on Bore & Barrel.`,
      url: shareUrl,
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        setShareFeedback('Shared successfully!')
        setTimeout(() => setShareFeedback(''), 3000)
        return
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, using clipboard:', err)
        } else {
          return // User cancelled
        }
      }
    }

    // Fallback: Clipboard API
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setShareFeedback('Unique link copied to clipboard!')
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setShareFeedback('Unique link copied to clipboard!')
      }
      setTimeout(() => setShareFeedback(''), 3000)
    } catch {
      setShareFeedback(`Link: ${shareUrl}`)
      setTimeout(() => setShareFeedback(''), 5000)
    }
  }

  // FEATURE 9: Add to Shopping Cart
  const handleAddToCart = () => {
    addToCart(gun, 1)
    setCartFeedback(`Added ${gun.name} to order shortlist`)
    setTimeout(() => setCartFeedback(''), 3000)
  }

  return (
    <div className="detail">
      {/* Back button & Unique URL notification */}
      <div className="detail-top-bar">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>

        <div className="detail-top-actions">
          {/* FEATURE 5: Share button */}
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleShare}
            title="Share unique link to this weapon"
          >
            <Share2 size={15} /> Share Link
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div className="toast toast--success">
          <Check size={18} /> {shareFeedback}
        </div>
      )}

      {cartFeedback && (
        <div className="toast toast--success">
          <Check size={18} /> {cartFeedback}
        </div>
      )}

      {/* Hero Section with Image Gallery (FEATURE 1) */}
      <div className="detail-hero">
        <div className="detail-hero-media">
          <ImageGallery images={gun.images || [gun.image_url || gun.image]} alt={gun.name} />
        </div>

        <div className="detail-info">
          <div className="detail-status-row">
            <span className="mono-badge">REF: {gun.id}</span>
            {gun.status === 'archived' && (
              <span className="badge badge--warning">ARCHIVED</span>
            )}
            {gun.status === 'draft' && (
              <span className="badge badge--draft">DRAFT</span>
            )}
          </div>

          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          {/* Action Row */}
          <div className="detail-actions">
            {/* FEATURE 9: Add to Cart button */}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAddToCart}
              title="Add this piece to procurement order"
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>

            <FavoriteButton gunId={gun.id || gun.name} />

            {onEdit && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onEdit(gun)}
                title="Edit hardware record"
              >
                <Edit size={15} /> Edit
              </button>
            )}

            {/* FEATURE 7: Archive / Delete */}
            {onArchive && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onArchive(gun)}
                title="Archive weapon from public view"
              >
                <Archive size={15} /> Archive
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => onDelete(gun)}
                title="Remove hardware record"
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Armory Specifications &amp; Overview</h2>
        <p className="detail-desc-text">
          {gun.description || 'No detailed mission description available for this piece.'}
        </p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Technical Parameters</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Maintenance / Assembly Protocol */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Field Stripping &amp; Maintenance Protocol</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>{step.instruction || step}</li>
            ))}
          </ol>
        </section>
      )}

      {/* FEATURE 8: Reviews CRUD & Reactions */}
      <ProductReviews gunId={gun.id} gunName={gun.name} />
    </div>
  )
}
