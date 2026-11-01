import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/helpers'

/**
 * CartPage (FEATURE 9: Shopping Cart & WhatsApp Checkout)
 */
export default function CartPage({ onNavigateCatalog, onSelectGun }) {
  const {
    items,
    subtotal,
    total,
    itemCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCheckoutUrl,
    whatsAppNumber,
  } = useCart()

  const handleCheckout = () => {
    const url = getCheckoutUrl()
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="cart-page">
      <section className="masthead">
        <h1 className="display">Procurement Order Cart</h1>
        <p className="lede">
          Review hardware marked for order, adjust piece quantities, and initiate WhatsApp checkout.
        </p>
      </section>

      {items.length === 0 ? (
        <div className="state-box cart-empty-state">
          <ShoppingCart size={48} stroke="var(--steel)" />
          <h2>Your armory cart is empty</h2>
          <p className="lede">
            Explore our current stock of pistols, rifles, and shotguns to mark items for procurement.
          </p>
          {onNavigateCatalog && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onNavigateCatalog}
              style={{ marginTop: '16px' }}
            >
              Browse Catalog <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="cart-layout">
          {/* Items List */}
          <div className="cart-items-section">
            <div className="list-head">
              <h2>Order Items ({itemCount})</h2>
              <button
                type="button"
                className="btn btn--danger-ghost btn--sm"
                onClick={clearCart}
                title="Remove all items from cart"
              >
                Clear Cart
              </button>
            </div>

            <ul className="cart-items-list">
              {items.map((item) => {
                const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1)
                return (
                  <li key={item.id} className="cart-item-row">
                    <img
                      src={item.image_url || '/guns/pistol.svg'}
                      alt={item.name}
                      className="cart-item-thumb"
                      onClick={() => onSelectGun && onSelectGun(item)}
                      style={{ cursor: onSelectGun ? 'pointer' : 'default' }}
                    />

                    <div className="cart-item-details">
                      <h3
                        className="display cart-item-name"
                        onClick={() => onSelectGun && onSelectGun(item)}
                        style={{ cursor: onSelectGun ? 'pointer' : 'default' }}
                      >
                        {item.name}
                      </h3>
                      <p className="cart-item-meta">
                        {item.type} {item.caliber ? `· ${item.caliber}` : ''}
                      </p>
                      <span className="cart-item-unit-price">
                        {formatPrice(item.price)} each
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="cart-qty-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value) || 1))}
                        className="qty-input"
                        aria-label="Item quantity"
                      />

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Line total & Delete */}
                    <div className="cart-item-price-col">
                      <span className="cart-item-total">{formatPrice(lineTotal)}</span>
                      <button
                        type="button"
                        className="cart-item-remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove from order"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {onNavigateCatalog && (
              <button
                type="button"
                className="link-btn"
                onClick={onNavigateCatalog}
                style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Continue Browsing Catalog
              </button>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="cart-summary-card card-box">
            <h2 className="card-box-title">Order Summary</h2>

            <div className="summary-row">
              <span className="summary-label">Hardware Subtotal</span>
              <span className="summary-val">{formatPrice(subtotal)}</span>
            </div>

            <div className="summary-row">
              <span className="summary-label">Federal Armory Transfer Fee</span>
              <span className="summary-val">$0.00 (Included)</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-row summary-row--total">
              <span className="summary-label">Total Payable</span>
              <span className="summary-val summary-val--total">{formatPrice(total)}</span>
            </div>

            <div className="summary-notice">
              <p>
                Orders are fulfilled directly by our bench armorers. Clicking checkout opens
                WhatsApp with your complete pre-filled order manifest for rapid verification.
              </p>
              <div className="wa-number-badge">
                <MessageCircle size={14} /> Contact Line: +{whatsAppNumber}
              </div>
            </div>

            {/* FEATURE 9: WhatsApp Checkout Button */}
            <button
              type="button"
              className="btn btn--primary btn--checkout"
              onClick={handleCheckout}
            >
              <MessageCircle size={18} /> Checkout via WhatsApp
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

