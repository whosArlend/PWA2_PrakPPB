import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import gunService from '../services/gunService'
import { useProductMutations } from '../hooks/useGuns'
import MultiImageUploader from '../components/common/MultiImageUploader'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * EditGunPage — Modify existing hardware with multiple images (FEATURE 1),
 * specs, steps, and draft support.
 */
export default function EditGunPage({ gun, gunId, onBack, onSuccess }) {
  const routeParams = useParams()
  const navigate = useNavigate()
  const targetId = gunId || gun?.id || routeParams?.id
  const handleBack = onBack || (() => navigate(-1))
  const handleSuccess = onSuccess || (() => navigate('/catalog'))
  const { updateGun } = useProductMutations()

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'Pistol',
    price: 599,
    description: '',
    status: 'published',
    is_featured: false,
  })

  // FEATURE 1: Multiple Images
  const [images, setImages] = useState(['/guns/pistol.svg'])

  // Specs & Steps
  const [specs, setSpecs] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => (targetId ? hasDraft(targetId) : false))
  const [draftTimestamp, setDraftTimestamp] = useState(() => (targetId ? getDraftTimestamp(targetId) : null))

  // Fetch initial data
  useEffect(() => {
    const fetchGun = async () => {
      try {
        setLoading(true)
        setError('')

        let data = gun
        if (!data || !data.ingredients || !data.images) {
          if (targetId) {
            const res = await gunService.getGunById(targetId)
            if (res.success && res.data) {
              data = res.data
            }
          }
        }

        if (data) {
          setFormData({
            name: data.name || '',
            type: data.type || 'Pistol',
            caliber: data.caliber || '9mm',
            category: data.category || 'Pistol',
            price: data.price ?? data.cook_time ?? 599,
            description: data.description || '',
            status: data.status || 'published',
            is_featured: Boolean(data.is_featured),
          })

          const loadedImages = Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image_url || data.image || '/guns/pistol.svg']
          setImages(loadedImages)

          if (data.ingredients && data.ingredients.length > 0) {
            setSpecs(data.ingredients.map((ing) => ({
              name: ing.name || '',
              quantity: ing.quantity || '',
            })))
          } else {
            setSpecs([
              { name: 'Platform', quantity: data.type || 'Pistol' },
              { name: 'Caliber', quantity: data.caliber || '9mm' },
            ])
          }

          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')))
          } else {
            setSteps(['Standard manufacturer maintenance and cleaning protocol.'])
          }
        } else {
          setError('Hardware record could not be loaded.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load hardware record.')
      } finally {
        setLoading(false)
      }
    }

    if (targetId) {
      fetchGun()
    }
  }, [targetId, gun])

  // Draft operations
  const handleLoadDraft = () => {
    const draft = loadDraft(targetId)
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (draft.images) setImages(draft.images)
      setShowDraftModal(false)
      setSuccessMsg('Saved draft restored.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft(targetId)
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleManualSaveDraft = () => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
    }
    const saved = saveDraft(draftData, targetId)
    if (saved) {
      const ts = getDraftTimestamp(targetId)
      setDraftTimestamp(ts)
      setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // Specs & Steps
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product designation must be at least 3 characters.')
      return
    }

    if (images.length === 0) {
      setError('Please provide at least one image or vector.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    const cleanSteps = steps.filter((s) => s.trim()).map((s) => s.trim())

    const payload = {
      name: formData.name.trim(),
      type: formData.type || 'Pistol',
      category: formData.type || 'Pistol',
      caliber: formData.caliber.trim() || '9mm',
      price: Number(formData.price) || 0,
      description: formData.description.trim(),
      images,
      image_url: images[0] || '/guns/pistol.svg',
      ingredients: cleanSpecs,
      steps: cleanSteps,
      status: formData.status || 'published',
      is_featured: Boolean(formData.is_featured),
    }

    try {
      setUpdating(true)
      const res = await gunService.updateGun(targetId, payload)
      if (res.success || res.data) {
        deleteDraft(targetId)
        handleSuccess(res.data)
      } else {
        throw new Error(res.message || 'Failed to update record.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating record.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={32} className="spin" />
        <p>Loading hardware details for editing…</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleManualSaveDraft}
          title="Save draft"
        >
          <Save size={14} /> Quick Save
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Modify Hardware Record</h1>
        <p className="lede">
          Updating record ID: <code className="mono-badge">{targetId}</code>
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* FEATURE 1: Multi-Image Uploader */}
        <MultiImageUploader images={images} onChange={setImages} />

        {/* Core fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-type" className="form-label">
              Platform Category <span className="req">*</span>
            </label>
            <select
              id="edit-type"
              name="type"
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              className="form-select"
            >
              <option value="Pistol">Pistol (Sidearm)</option>
              <option value="Rifle">Rifle (Long Gun)</option>
              <option value="Shotgun">Shotgun (Smoothbore)</option>
              <option value="Submachine Gun">Submachine Gun</option>
            </select>
          </div>
        </div>

        <div className="form-grid form-grid--3">
          <div className="form-group">
            <label htmlFor="edit-caliber" className="form-label">
              Caliber / Chambering <span className="req">*</span>
            </label>
            <input
              id="edit-caliber"
              type="text"
              name="caliber"
              value={formData.caliber}
              onChange={(e) => setFormData((p) => ({ ...p, caliber: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              name="price"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              className="form-input"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-status" className="form-label">
              Catalog Status
            </label>
            <select
              id="edit-status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
              className="form-select"
            >
              <option value="published">Published (Public Catalog)</option>
              <option value="draft">Draft (Work in Progress)</option>
              <option value="archived">Archived (Stored in Archive)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-desc" className="form-label">
            Armory Notes &amp; Overview
          </label>
          <textarea
            id="edit-desc"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="form-textarea"
          />
        </div>

        {/* Specs */}
        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Specifications &amp; Components</label>
            <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
              <Plus size={14} /> Add Spec
            </button>
          </div>
          <div className="multi-rows">
            {specs.map((spec, i) => (
              <div key={i} className="multi-row">
                <input
                  type="text"
                  placeholder="Attribute"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={spec.quantity}
                  onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => removeSpec(i)}
                  disabled={specs.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Assembly &amp; Maintenance Protocol</label>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Plus size={14} /> Add Step
            </button>
          </div>
          <div className="multi-rows">
            {steps.map((st, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <input
                  type="text"
                  value={st}
                  onChange={(e) => handleStepChange(i, e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div className="checkbox-row">
          <input
            id="edit-is-featured"
            type="checkbox"
            name="is_featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData((p) => ({ ...p, is_featured: e.target.checked }))}
            className="form-checkbox"
          />
          <label htmlFor="edit-is-featured" className="checkbox-label">
            Feature in Armory Showcase
          </label>
        </div>

        {/* Submit */}
        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={handleBack} disabled={updating}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={updating}>
            {updating ? (
              <><Loader size={18} className="spin" /> Updating Record…</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* Restore draft dialog */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Unsaved Changes?"
        message={`An unsaved draft for this product was saved on ${draftTimestamp ? formatDraftTime(draftTimestamp) : 'earlier'}. Would you like to restore it?`}
        confirmLabel="Restore Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
