import { Plus, ShoppingCart, Heart, User, Layers } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useCart } from '../context/CartContext'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Catalog', icon: Layers },
  { id: 'Favorites', label: 'Favorites', icon: Heart, hasFavBadge: true },
  { id: 'Cart', label: 'Cart', icon: ShoppingCart, hasCartBadge: true },
  { id: 'Profile', label: 'Profile', icon: User },
]

export default function Header({ tab, onTab, onNavigateCreate }) {
  const { favorites } = useFavorites()
  const favCount = favorites ? favorites.length : 0

  const { itemCount } = useCart()

  return (
    <header className="header">
      <div
        className="header-brand-wrap"
        onClick={() => onTab('Catalog')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div className="header-logo-badge">
          <img src="/logo.png" alt="Bore & Barrel" />
        </div>
        <span className="brand display">Bore &amp; Barrel</span>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'nav-link active' : 'nav-link'}
            onClick={() => onTab(item.id)}
          >
            {item.label}

            {/* Favorites Badge */}
            {item.hasFavBadge && favCount > 0 && (
              <span className="nav-badge">{favCount}</span>
            )}

            {/* Cart Badge (FEATURE 9) */}
            {item.hasCartBadge && itemCount > 0 && (
              <span className="nav-badge nav-badge--cart">{itemCount}</span>
            )}
          </button>
        ))}
      </nav>

      {onNavigateCreate && (
        <button
          type="button"
          className="btn btn--primary btn--sm header-cta"
          onClick={onNavigateCreate}
          title="Register new hardware"
        >
          <Plus size={15} /> Add Hardware
        </button>
      )}
    </header>
  )
}
