import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react'
import gunService from '../services/gunService'
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
 * CreateGunPage — Register new hardware with multiple image upload (FEATURE 1),
 * draft auto-save and explicit draft saving (FEATURE 6), specs, and assembly steps.
 */
export default function CreateGunPage({ onBack, onSuccess }) {
  const navigate = useNavigate()
  const handleBack = onBack || (() => navigate(-1))
  const handleSuccess = onSuccess || (() => navigate('/catalog'))
  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'Pistol',
    price: 599,
    description: '',
    is_featured: false,
  })

  // FEATURE 1: Multiple Images
  const [images, setImages] = useState(['/guns/pistol.svg'])

  // Technical Specs
  const [specs, setSpecs] = useState([
    { name: 'Frame', quantity: 'Polymer' },
    { name: 'Action', quantity: 'Striker-Fired' },
    { name: 'Capacity', quantity: '17 rounds' },
  ])

  // Maintenance Steps
  const [steps, setSteps] = useState([
    'Verify firearm is completely unloaded and point in safe direction.',
    'Disassemble slide assembly from receiver frame for routine maintenance.',
  ])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => hasDraft('create'))
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  // Auto-save draft
  const handleSaveDraft = useCallback((notify = true) => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
    }
    const saved = saveDraft(draftData, 'create')
    if (saved) {
      const ts = getDraftTimestamp('create')
      setDraftTimestamp(ts)
      if (notify) {
        setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }
  }, [formData, specs, steps, images])

  useEffect(() => {
    const interval = setInterval(() => {
      handleSaveDraft(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [handleSaveDraft])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (draft.images && draft.images.length > 0) setImages(draft.images)
      setShowDraftModal(false)
      setSuccessMsg('Draft restored from local cache.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Spec handlers
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

  // Step handlers
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

  // Submit product (published or draft)
  const handleSubmit = async (e, asDraft = false) => {
    if (e) e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product designation must be at least 3 characters.')
      return
    }

    if (images.length === 0) {
      setError('Please provide at least one image or armory vector.')
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
      caliber: formData.caliber.trim() || 'Standard',
      price: Number(formData.price) || 0,
      description: formData.description.trim(),
      images,
      image_url: images[0] || '/guns/pistol.svg',
      ingredients: cleanSpecs,
      steps: cleanSteps,
      status: asDraft ? 'draft' : 'published', // FEATURE 6: Draft status
      is_featured: Boolean(formData.is_featured),
    }

    try {
      setCreating(true)
      const response = await gunService.createGun(payload)
      if (response.success || response.data) {
        deleteDraft('create')
        handleSuccess(response.data)
      } else {
        throw new Error(response.message || 'Failed to register product.')
      }
    } catch (err) {
      setError(err.message || 'Failed to register hardware record.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={handleBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => handleSaveDraft(true)}
            title="Save draft locally"
          >
            <Save size={14} /> Quick Save
          </button>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={(e) => handleSubmit(e, true)}
            disabled={creating}
            title="Save to Armory Drafts (Will not be public)"
          >
            <FileText size={14} /> Save as Draft
          </button>
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
        <p className="lede">
          Add a firearm, carbine, or platform to the Armory catalog.
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

      <form onSubmit={(e) => handleSubmit(e, false)} className="entry-form">
        {/* FEATURE 1: Multiple Images Uploader */}
        <MultiImageUploader images={images} onChange={setImages} />

        {/* Basic Info */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Glock 19 Gen 5, Colt M4A1..."
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="type" className="form-label">
              Platform Category <span className="req">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              className="form-select"
            >
              <option value="Pistol">Pistol (Sidearm)</option>
              <option value="Rifle">Rifle (Long Gun)</option>
              <option value="Shotgun">Shotgun (Smoothbore)</option>
              <option value="Submachine Gun">Submachine Gun</option>
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="caliber" className="form-label">
              Caliber / Chambering <span className="req">*</span>
            </label>
            <input
              id="caliber"
              type="text"
              name="caliber"
              value={formData.caliber}
              onChange={handleFormChange}
              placeholder="e.g. 9x19mm, 5.56 NATO, 12 Gauge"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="price"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleFormChange}
              min="0"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Armory Notes &amp; Overview
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            rows={3}
            placeholder="Field history, ergonomics, trigger pull characteristics..."
            className="form-textarea"
          />
        </div>

        {/* Specifications */}
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
                  placeholder="Attribute (e.g. Action, Frame)"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Striker-Fired, Polymer)"
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

        {/* Assembly / Maintenance Steps */}
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
                  placeholder="e.g. Clear the chamber and inspect barrel..."
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

        {/* Featured Checkbox */}
        <div className="checkbox-row">
          <input
            id="is_featured"
            type="checkbox"
            name="is_featured"
            checked={formData.is_featured}
            onChange={handleFormChange}
            className="form-checkbox"
          />
          <label htmlFor="is_featured" className="checkbox-label">
            Feature in Armory Showcase
          </label>
        </div>

        {/* Action Buttons */}
        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={handleBack} disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={(e) => handleSubmit(e, true)}
            disabled={creating}
          >
            Save as Draft
          </button>
          <button type="submit" className="btn btn--primary" disabled={creating}>
            {creating ? (
              <><Loader size={18} className="spin" /> Registering…</>
            ) : (
              'Publish to Armory'
            )}
          </button>
        </div>
      </form>

      {/* Restore Draft Modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Previous Draft?"
        message={`An unfinished draft from ${draftTimestamp ? formatDraftTime(draftTimestamp) : 'earlier'} was detected. Would you like to resume?`}
        confirmLabel="Load Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
