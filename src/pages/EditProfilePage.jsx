import { useState } from 'react'
import { ArrowLeft, Save, X, Camera, Shield, Check, AlertCircle } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage (FEATURE 6: Dedicated Profile Editing Page)
 */
export default function EditProfilePage({ onBack, onSuccess }) {
  const [profile] = useState(() => userService.getUserProfile())

  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [contactEmail, setContactEmail] = useState(profile.contact_email || 'armory@boreandbarrel.com')
  const [contactPhone, setContactPhone] = useState(profile.contact_phone || '(555) 010-0100')
  const [stationAddress, setStationAddress] = useState(profile.station_address || '123 Range Road, Armory District')
  const [operatingHours, setOperatingHours] = useState(profile.operating_hours || 'Tuesday to Saturday, 10:00 AM – 6:00 PM')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAvatarFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar file size must be under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target.result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim() || username.trim().length < 2) {
      setError('Operator Callsign must be at least 2 characters.')
      return
    }

    if (contactEmail && !/\S+@\S+\.\S+/.test(contactEmail)) {
      setError('Please provide a valid contact email address.')
      return
    }

    try {
      setSaving(true)
      const updated = {
        ...profile,
        username: username.trim(),
        bio: bio.trim(),
        avatar,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        station_address: stationAddress.trim(),
        operating_hours: operatingHours.trim(),
      }

      const res = await userService.saveUserProfile(updated)
      if (res.success) {
        setSuccess('Profile updated successfully.')
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data)
          else if (onBack) onBack()
        }, 1000)
      } else {
        throw new Error(res.message || 'Failed to save profile.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-page edit-profile-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Modify Operator Profile</h1>
        <p className="lede">
          Update your public identity, armorer biography, and station contact information.
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="toast toast--success">
          <Check size={18} /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* Avatar Section */}
        <div className="card-box">
          <h2 className="card-box-title">Operator Avatar</h2>
          <div className="edit-avatar-section">
            <div className="avatar-wrap">
              {avatar ? (
                <img src={avatar} alt={username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={36} stroke="var(--brass)" />
                </div>
              )}
              <label htmlFor="avatar-file-field" className="avatar-upload-btn" title="Upload new photo">
                <Camera size={14} />
                <input
                  id="avatar-file-field"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden-file-input"
                />
              </label>
            </div>
            <div className="edit-avatar-info">
              <span className="upload-main-text">Upload Operator Insignia</span>
              <span className="upload-sub-text">Recommended: Square PNG or JPG under 2MB</span>
              {avatar && (
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--sm"
                  onClick={() => setAvatar(null)}
                  style={{ marginTop: '8px' }}
                >
                  Remove Avatar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section A: Identity & Bio */}
        <div className="card-box">
          <h2 className="card-box-title">Identity &amp; Armorer Bio</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="prof-username" className="form-label">
                Callsign / Operator Alias <span className="req">*</span>
              </label>
              <input
                id="prof-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Operator Delta, Master Gunsmith"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-uuid" className="form-label">
                Permanent Operator ID (Read-only)
              </label>
              <input
                id="prof-uuid"
                type="text"
                value={profile.userId || ''}
                readOnly
                disabled
                className="form-input form-input--disabled"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prof-bio" className="form-label">
              Armory Biography &amp; Technical Qualifications
            </label>
            <textarea
              id="prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Background, armorer certifications, specialized platform experience..."
              rows={3}
              className="form-textarea"
            />
          </div>
        </div>

        {/* Section B: Contact Information */}
        <div className="card-box">
          <h2 className="card-box-title">Armory Contact Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="prof-email" className="form-label">
                Official Contact Email
              </label>
              <input
                id="prof-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="armory@boreandbarrel.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-phone" className="form-label">
                Dispatch Phone Line
              </label>
              <input
                id="prof-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 010-0100"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="prof-address" className="form-label">
                Shop Address / Bench Location
              </label>
              <input
                id="prof-address"
                type="text"
                value={stationAddress}
                onChange={(e) => setStationAddress(e.target.value)}
                placeholder="123 Range Road"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-hours" className="form-label">
                Armory Operating Hours
              </label>
              <input
                id="prof-hours"
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="Tuesday to Saturday, 10 to 6"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack} disabled={saving}>
            <X size={16} /> Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving Profile…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
