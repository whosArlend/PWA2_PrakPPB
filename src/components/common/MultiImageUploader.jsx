import { useState } from 'react'
import { X, Star, Loader, Plus, AlertCircle } from 'lucide-react'
import uploadService from '../../services/uploadService'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * MultiImageUploader Component (FEATURE 1: Multiple Images per Catalog)
 * Supports multiple file selection, validation, uploading, primary selection, and removal.
 */
export default function MultiImageUploader({
  images = [],
  onChange,
  maxImages = 6,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Handle files selection
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed per hardware piece.`)
      return
    }

    // Validate all files
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Invalid format (${file.name}). Allowed: JPG, PNG, WebP.`)
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File exceeds 5MB limit (${file.name}).`)
        return
      }
    }

    try {
      setUploading(true)
      setError('')
      const uploadPromises = files.map(async (file) => {
        try {
          const res = await uploadService.uploadImage(file)
          if (res.success && res.data?.url) {
            return res.data.url
          }
        } catch (uploadErr) {
          console.warn('Network upload failed, reading locally:', uploadErr)
        }
        // Fallback: read as base64 data URL
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (evt) => resolve(evt.target.result)
          reader.readAsDataURL(file)
        })
      })

      const newUrls = await Promise.all(uploadPromises)
      const merged = [...images, ...newUrls]
      onChange(merged)
    } catch (err) {
      setError(err.message || 'Failed to upload one or more images.')
    } finally {
      setUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  // Stock preset selector
  const handleAddPreset = (url) => {
    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed.`)
      return
    }
    setError('')
    onChange([...images, url])
  }

  // Remove image
  const handleRemove = (index) => {
    const copy = images.filter((_, i) => i !== index)
    onChange(copy)
  }

  // Make primary (move to index 0)
  const handleMakePrimary = (index) => {
    if (index === 0) return
    const target = images[index]
    const remaining = images.filter((_, i) => i !== index)
    onChange([target, ...remaining])
  }

  return (
    <div className="multi-uploader-box card-box">
      <div className="card-box-header">
        <div>
          <h2 className="card-box-title">Weapon Imagery &amp; Blueprints</h2>
          <p className="card-box-desc">
            Upload multiple photos from different angles (max {maxImages} images, 5MB each). The first image is set as Primary in catalog listings.
          </p>
        </div>
      </div>

      {error && (
        <div className="toast toast--error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Grid of uploaded images */}
      <div className="multi-images-grid">
        {images.map((url, idx) => (
          <div key={idx} className={`multi-thumb-wrap ${idx === 0 ? 'multi-thumb-wrap--primary' : ''}`}>
            <img src={url} alt={`Hardware view ${idx + 1}`} className="multi-thumb-img" />

            {/* Badges and controls */}
            {idx === 0 ? (
              <span className="primary-pill">
                <Star size={11} fill="currentColor" /> Primary
              </span>
            ) : (
              <button
                type="button"
                className="btn-make-primary"
                onClick={() => handleMakePrimary(idx)}
                title="Set as primary catalog image"
              >
                Set Primary
              </button>
            )}

            <button
              type="button"
              className="btn-remove-thumb"
              onClick={() => handleRemove(idx)}
              title="Remove image"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Upload Slot */}
        {images.length < maxImages && (
          <label className={`upload-slot-btn ${uploading ? 'upload-slot--disabled' : ''}`}>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden-file-input"
            />
            {uploading ? (
              <>
                <Loader size={20} className="spin" />
                <span className="upload-slot-text">Uploading…</span>
              </>
            ) : (
              <>
                <Plus size={22} />
                <span className="upload-slot-text">Add Images</span>
                <span className="upload-slot-sub">JPG, PNG, WebP</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Stock Presets */}
      <div className="preset-selector" style={{ marginTop: '16px' }}>
        <span className="preset-title">Quick add standard armory vector:</span>
        <div className="preset-pills">
          <button
            type="button"
            className="pill"
            onClick={() => handleAddPreset('/guns/pistol.svg')}
            disabled={images.length >= maxImages}
          >
            Pistol Vector
          </button>
          <button
            type="button"
            className="pill"
            onClick={() => handleAddPreset('/guns/rifle.svg')}
            disabled={images.length >= maxImages}
          >
            Rifle Vector
          </button>
          <button
            type="button"
            className="pill"
            onClick={() => handleAddPreset('/guns/shotgun.svg')}
            disabled={images.length >= maxImages}
          >
            Shotgun Vector
          </button>
        </div>
      </div>
    </div>
  )
}
