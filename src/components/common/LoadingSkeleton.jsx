import { Loader } from 'lucide-react'

export function PageLoadingSkeleton({ message = 'Loading Armory Data…' }) {
  return (
    <div className="page-skeleton-wrap">
      <div className="skeleton-spinner">
        <Loader size={36} className="spin" stroke="var(--brass)" />
      </div>
      <p className="skeleton-text">{message}</p>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <li className="card skeleton-card">
      <div className="skeleton-box skeleton-box--img" />
      <div className="skeleton-box skeleton-box--title" />
      <div className="skeleton-box skeleton-box--sub" />
      <div className="skeleton-box skeleton-box--price" />
    </li>
  )
}

export function CatalogGridSkeleton({ count = 6 }) {
  return (
    <ul className="stock">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ul>
  )
}

export default PageLoadingSkeleton

