import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination Component (FEATURE 2)
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 6,
  onPageChange,
  onPageSizeChange,
}) {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxButtons = 5

    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }

    for (let p = start; p <= end; p++) {
      pages.push(p)
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        <span>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          {totalItems > 0 && ` (${totalItems} total pieces)`}
        </span>
        {onPageSizeChange && (
          <div className="pagination-size-select">
            <label htmlFor="page-size-selector">Per page:</label>
            <select
              id="page-size-selector"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="pagination-select"
            >
              <option value="6">6</option>
              <option value="9">9</option>
              <option value="12">12</option>
            </select>
          </div>
        )}
      </div>

      <nav className="pagination-nav" aria-label="Catalog pagination">
        {/* Previous Button */}
        <button
          type="button"
          className="btn btn--outline btn--sm pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {pages[0] > 1 && (
            <>
              <button
                type="button"
                className={`page-num-btn ${currentPage === 1 ? 'page-num-btn--active' : ''}`}
                onClick={() => onPageChange(1)}
              >
                1
              </button>
              {pages[0] > 2 && <span className="pagination-ellipsis">…</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`page-num-btn ${currentPage === p ? 'page-num-btn--active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={currentPage === p ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && (
                <span className="pagination-ellipsis">…</span>
              )}
              <button
                type="button"
                className={`page-num-btn ${currentPage === totalPages ? 'page-num-btn--active' : ''}`}
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          className="btn btn--outline btn--sm pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  )
}

