import { ShoppingCart } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { useCart } from '../../context/CartContext'
import { formatPrice, truncate } from '../../utils/helpers'

/**
 * Product card used in the catalog grid (FEATURES 1, 3, 9).
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onSelect  — called with the gun when clicked
 * @param {Function} [props.onEdit]  — called when Edit is clicked
 * @param {Function} [props.onDelete]— called when Delete/Archive is clicked
 */
export default function GunCard({ gun, onSelect, onEdit, onDelete }) {
  const { addToCart } = useCart()

  // FEATURE 1: Primary image resolution
  const primaryImg =
    (gun.images && gun.images.length > 0 ? gun.images[0] : null) ||
    gun.image_url ||
    gun.image ||
    '/guns/pistol.svg'

  const category = gun.type || gun.category || 'Hardware'
  const caliber = gun.caliber || ''
  const price = gun.price ?? gun.cook_time ?? 0

  const handleQuickAdd = (e) => {
    e.stopPropagation()
    addToCart(gun, 1)
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        {/* FEATURE 3: Lazy loading image with placeholder */}
        <LazyImage
          className="card-img-wrap"
          src={primaryImg}
          alt={gun.name}
          width="240"
          height="180"
          fallbackSrc="/guns/pistol.svg"
        />

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <div className="card-bottom-row">
          <span className="price">{formatPrice(price)}</span>

          {/* FEATURE 9: Quick Add to Cart button */}
          <button
            type="button"
            className="card-cart-btn"
            onClick={handleQuickAdd}
            title={`Add ${gun.name} to cart`}
            aria-label={`Add ${gun.name} to cart`}
          >
            <ShoppingCart size={15} />
          </button>
        </div>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        <FavoriteButton gunId={gun.id || gun.name} />

        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(gun)
            }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(gun)
            }}
            aria-label={`Archive or Delete ${gun.name}`}
            title="Archive / Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}
