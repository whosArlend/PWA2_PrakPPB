import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import LazyImage from '../common/LazyImage'

/**
 * ImageGallery Component (FEATURE 1: Multiple Images per Catalog)
 * Features carousel navigation, thumbnail picker, keyboard support, and fallback handling.
 */
export default function ImageGallery({ images = [], alt = 'Hardware item' }) {
  // Normalize images into array of strings
  const cleanImages = (images && images.length > 0 ? images : ['/guns/pistol.svg']).map(
    (img) => (typeof img === 'string' ? img : img.image_url || '/guns/pistol.svg'),
  )

  const [currentIndex, setCurrentIndex] = useState(0)

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? cleanImages.length - 1 : prev - 1))
  }, [cleanImages.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === cleanImages.length - 1 ? 0 : prev + 1))
  }, [cleanImages.length])

  // Keyboard navigation when focused
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (cleanImages.length <= 1) return
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cleanImages.length, handleNext, handlePrev])

  return (
    <div className="gallery-container">
      {/* Main Image Display */}
      <div className="gallery-main-wrap">
        <LazyImage
          src={cleanImages[currentIndex]}
          alt={`${alt} - View ${currentIndex + 1}`}
          className="gallery-main-img"
          fallbackSrc="/guns/pistol.svg"
        />

        {/* Navigation arrows (only if multiple images) */}
        {cleanImages.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-arrow--left"
              onClick={handlePrev}
              aria-label="Previous image"
              title="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-arrow--right"
              onClick={handleNext}
              aria-label="Next image"
              title="Next image"
            >
              <ChevronRight size={22} />
            </button>

            {/* Badge counter */}
            <div className="gallery-badge">
              <ImageIcon size={12} />
              <span>
                {currentIndex + 1} / {cleanImages.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip (only if multiple images) */}
      {cleanImages.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Product thumbnails">
          {cleanImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={currentIndex === idx}
              aria-label={`Select image ${idx + 1}`}
              className={`gallery-thumb-btn ${currentIndex === idx ? 'gallery-thumb-btn--active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            >
              <LazyImage
                src={imgUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="gallery-thumb-img"
                fallbackSrc="/guns/pistol.svg"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

