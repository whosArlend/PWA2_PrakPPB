import { useState } from 'react'
import { Shield } from 'lucide-react'

/**
 * LazyImage component (FEATURE 3)
 * Provides native loading="lazy", a loading placeholder shimmer, and fallback on error.
 */
export default function LazyImage({
  src,
  alt = 'Hardware image',
  className = '',
  fallbackSrc = '/guns/pistol.svg',
  width,
  height,
  ...props
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setLoaded(true)
  }

  const handleError = () => {
    setError(true)
    setLoaded(true)
  }

  const finalSrc = error ? fallbackSrc : (src || fallbackSrc)

  return (
    <div className={`lazy-image-container ${className}`} style={{ position: 'relative' }}>
      {!loaded && (
        <div className="skeleton-placeholder" aria-hidden="true">
          <div className="skeleton-shimmer" />
        </div>
      )}
      <img
        src={finalSrc}
        alt={alt}
        loading="lazy"
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`lazy-img-element ${loaded ? 'lazy-img-loaded' : 'lazy-img-loading'}`}
        {...props}
      />
      {error && (
        <div className="lazy-image-fallback-icon" title="Using fallback vector">
          <Shield size={16} />
        </div>
      )}
    </div>
  )
}

