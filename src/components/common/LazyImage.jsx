import { useState, useEffect, useRef } from 'react'
import { Shield } from 'lucide-react'

// 1x1 transparent SVG data URI: acts as placeholder without initiating HTTP request
const TRANSPARENT_PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%221%22 height%3D%221%22%2F%3E'

/**
 * LazyImage component (FEATURE 3: Image Lazy Loading via Intersection Observer)
 * Defers setting `src` until the element approaches the viewport.
 */
export default function LazyImage({
  src,
  alt = 'Hardware image',
  className = '',
  fallbackSrc = '/guns/pistol.svg',
  width,
  height,
  rootMargin = '100px 0px', // Start loading when 100px from viewport
  ...props
}) {
  const [isInView, setIsInView] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    // If IntersectionObserver is not supported (e.g. legacy/jsdom), load immediately
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin,
        threshold: 0.01,
      },
    )

    const el = containerRef.current
    if (el) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
  }, [rootMargin])

  const handleLoad = () => {
    setLoaded(true)
  }

  const handleError = () => {
    setError(true)
    setLoaded(true)
  }

  const targetSrc = error ? fallbackSrc : (src || fallbackSrc)
  const effectiveSrc = isInView ? targetSrc : TRANSPARENT_PLACEHOLDER

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className}`}
      style={{ position: 'relative' }}
      data-lazy-status={isInView ? (loaded ? 'loaded' : 'loading') : 'idle'}
    >
      {(!loaded || !isInView) && (
        <div className="skeleton-placeholder" aria-hidden="true">
          <div className="skeleton-shimmer" />
        </div>
      )}
      <img
        src={effectiveSrc}
        alt={alt}
        loading="lazy"
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`lazy-img-element ${loaded && isInView ? 'lazy-img-loaded' : 'lazy-img-loading'}`}
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
