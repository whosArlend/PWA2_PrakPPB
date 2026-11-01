import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, RefreshCw, AlertCircle, PackageOpen, Archive } from 'lucide-react'
import { useGuns, useProductMutations } from '../hooks/useGuns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import { CatalogGridSkeleton } from '../components/common/LoadingSkeleton'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page (FEATURES 2, 3, 7)
 * Implements pagination with reset on filter/search change,
 * soft-delete/archive on delete action, and skeleton lazy loading.
 */
export default function Catalog({ onNavigate }) {
  // ---- filters & pagination state ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // FEATURE 2: Configurable Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  // API data query with query caching (FEATURE 4)
  const { guns: allGuns, loading, error, refetch } = useGuns({
    status: 'published',
    limit: 100, // Fetch active published catalog
  })

  const { archiveGun } = useProductMutations()

  // Reset pagination to Page 1 whenever search, filter, or sorting changes
  const prevFiltersRef = useRef({ search, activeCategory, sortKey, sortOrder, pageSize })
  useEffect(() => {
    const prev = prevFiltersRef.current
    if (
      prev.search !== search ||
      prev.activeCategory !== activeCategory ||
      prev.sortKey !== sortKey ||
      prev.sortOrder !== sortOrder ||
      prev.pageSize !== pageSize
    ) {
      setPage(1)
      prevFiltersRef.current = { search, activeCategory, sortKey, sortOrder, pageSize }
    }
  }, [search, activeCategory, sortKey, sortOrder, pageSize])

  // Extract categories dynamically
  const categories = useMemo(() => extractCategories(allGuns), [allGuns])

  // Filter and sort items
  const filteredGuns = useMemo(() => {
    let result = allGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [allGuns, search, activeCategory, sortKey, sortOrder])

  // Client-side pagination over filtered results
  const totalItems = filteredGuns.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginatedGuns = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize
    return filteredGuns.slice(startIndex, startIndex + pageSize)
  }, [filteredGuns, safePage, pageSize])

  // Single product detail view
  const [selectedGun, setSelectedGun] = useState(null)

  // FEATURE 7: Soft Delete / Archive state
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return
    try {
      setArchiving(true)
      await archiveGun(archiveTarget.id)
      setFeedback(`"${archiveTarget.name}" archived from public catalog.`)
      setArchiveTarget(null)
      refetch()
      setTimeout(() => setFeedback(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to archive product.')
    } finally {
      setArchiving(false)
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    const catalogHeader = document.getElementById('catalog-stock-heading')
    if (catalogHeader) {
      catalogHeader.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // If viewing detail view
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onArchive={(g) => {
          setSelectedGun(null)
          setArchiveTarget(g)
        }}
        onDelete={(g) => {
          setSelectedGun(null)
          setArchiveTarget(g)
        }}
      />
    )
  }

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed with its type, caliber, and price — nothing else.
        </p>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Archive size={18} /> {feedback}
        </div>
      )}

      <section>
        <div id="catalog-stock-heading" className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {totalItems} piece{totalItems !== 1 ? 's' : ''} in armory
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
                title="Register new weapon to armory"
              >
                <Plus size={16} /> Add Hardware
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
          }}
        />

        {/* FEATURE 3: Loading Skeleton */}
        {loading && <CatalogGridSkeleton count={pageSize} />}

        {/* Error state */}
        {!loading && error && allGuns.length === 0 && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && totalItems === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No active products match your criteria.</p>
          </div>
        )}

        {/* Product grid (FEATURE 1: Primary images, FEATURE 3: Lazy loading) */}
        {!loading && paginatedGuns.length > 0 && (
          <ul className="stock">
            {paginatedGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={(g) => setArchiveTarget(g)}
              />
            ))}
          </ul>
        )}

        {/* FEATURE 2: Pagination Bar */}
        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

      {/* FEATURE 7: Soft Delete / Archive Confirmation Modal */}
      <ConfirmModal
        open={Boolean(archiveTarget)}
        title="Archive Hardware Record"
        message={`Are you sure you want to archive "${archiveTarget?.name}"? It will be removed from the public catalog and moved to your Archived records in Profile.`}
        confirmLabel="Archive"
        danger
        loading={archiving}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  )
}
