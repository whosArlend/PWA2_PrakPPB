import { useState, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import PageLoadingSkeleton from './components/common/LoadingSkeleton.jsx'
import './App.css'

// ---------------------------------------------------------------------------
// FEATURE 3: Lazy-loaded page components with React.lazy() and Suspense
// ---------------------------------------------------------------------------
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))

function App() {
  const [showSplash, setShowSplash] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Determine current active navigation tab based on URL path
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/' || path.startsWith('/catalog') || path.startsWith('/product')) return 'Catalog'
    if (path.startsWith('/favorites')) return 'Favorites'
    if (path.startsWith('/cart')) return 'Cart'
    if (path.startsWith('/profile')) return 'Profile'
    return ''
  }

  const handleTabChange = (tabId) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (tabId === 'Catalog') navigate('/catalog')
    else if (tabId === 'Favorites') navigate('/favorites')
    else if (tabId === 'Cart') navigate('/cart')
    else if (tabId === 'Profile') navigate('/profile')
  }

  const handleNavigateCreate = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    navigate('/hardware/new')
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={getActiveTab()}
        onTab={handleTabChange}
        onNavigateCreate={handleNavigateCreate}
      />

      <main className="main">
        {/* FEATURE 3: Suspense boundary with custom Armory skeleton */}
        <Suspense fallback={<PageLoadingSkeleton message="Accessing Armory Systems…" />}>
          <Routes>
            {/* Main Catalog Route */}
            <Route
              path="/"
              element={
                <Catalog
                  onNavigate={(dest, payload) => {
                    if (dest === 'Create') navigate('/hardware/new')
                    else if (dest === 'Edit') navigate(`/hardware/edit/${payload?.id}`)
                    else if (dest === 'Detail') navigate(`/product/${payload?.id}`)
                  }}
                />
              }
            />
            <Route
              path="/catalog"
              element={
                <Catalog
                  onNavigate={(dest, payload) => {
                    if (dest === 'Create') navigate('/hardware/new')
                    else if (dest === 'Edit') navigate(`/hardware/edit/${payload?.id}`)
                    else if (dest === 'Detail') navigate(`/product/${payload?.id}`)
                  }}
                />
              }
            />

            {/* FEATURE 5: Unique and stable product detail URL */}
            <Route path="/product/:id" element={<ProductDetailPage />} />

            {/* Favorites */}
            <Route
              path="/favorites"
              element={
                <FavoritesPage
                  onSelectGun={(g) => navigate(`/product/${g.id}`)}
                  onNavigateCatalog={() => navigate('/catalog')}
                />
              }
            />

            {/* FEATURE 9: Shopping Cart */}
            <Route
              path="/cart"
              element={
                <CartPage
                  onNavigateCatalog={() => navigate('/catalog')}
                  onSelectGun={(g) => navigate(`/product/${g.id}`)}
                />
              }
            />

            {/* FEATURE 6: Profile & Dedicated Edit Profile */}
            <Route
              path="/profile"
              element={
                <ProfilePage
                  onNavigateEditProfile={() => navigate('/profile/edit')}
                  onNavigateEditGun={(d) =>
                    d.isLocalDraft
                      ? navigate('/hardware/new')
                      : navigate(`/hardware/edit/${d.id}`)
                  }
                  onNavigateCreateGun={() => navigate('/hardware/new')}
                  onReplaySplash={() => setShowSplash(true)}
                />
              }
            />
            <Route
              path="/profile/edit"
              element={
                <EditProfilePage
                  onBack={() => navigate('/profile')}
                  onSuccess={() => navigate('/profile')}
                />
              }
            />

            {/* Hardware Management */}
            <Route
              path="/hardware/new"
              element={
                <CreateGunPage
                  onBack={() => navigate('/catalog')}
                  onSuccess={() => navigate('/catalog')}
                />
              }
            />
            <Route
              path="/hardware/edit/:id"
              element={
                <EditGunPage
                  onBack={() => navigate('/catalog')}
                  onSuccess={() => navigate('/catalog')}
                />
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        </Suspense>
      </main>

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
