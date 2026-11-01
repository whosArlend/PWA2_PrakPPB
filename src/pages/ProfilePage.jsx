import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Edit3,
  Play,
  RotateCcw,
  Trash2,
  ExternalLink,
  Archive,
  Upload,
  Mail,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react'
import userService from '../services/userService'
import gunService from '../services/gunService'
import { useFavorites } from '../hooks/useFavorites'
import { getAllDraftIds, loadDraft, deleteDraft, formatDraftTime } from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'
import { formatPrice } from '../utils/helpers'
import LazyImage from '../components/common/LazyImage'

/**
 * ProfilePage (FEATURES 6 & 7)
 * Restructured with:
 * A. About (Operator Bio + Armory Philosophy)
 * B. Contact (Shop Address, Phone, Email, Hours)
 * C. Drafts (Offline & Server Drafts with Publish & Continue Edit)
 * D. Edit Profile navigation button
 * E. Archived Records (Soft-delete management, Restore, Permanent Delete)
 */
export default function ProfilePage({
  onNavigateEditProfile,
  onNavigateEditGun,
  onNavigateCreateGun,
  onReplaySplash,
}) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()

  // FEATURE 6: Drafts state
  const [draftsList, setDraftsList] = useState([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)

  // FEATURE 7: Archived products state
  const [archivedList, setArchivedList] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(true)

  // Modals state
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null)
  const [deletingPermanent, setDeletingPermanent] = useState(false)

  // Active section tab in profile: 'about' | 'drafts' | 'archived'
  const [activeSection, setActiveSection] = useState('about')

  // Load fresh profile
  const reloadProfile = useCallback(async () => {
    const prof = await userService.fetchRemoteProfile()
    setProfile(prof)
  }, [])

  // Load Drafts
  const loadAllDrafts = useCallback(async () => {
    try {
      setLoadingDrafts(true)
      const combined = []

      // 1. Database drafts
      try {
        const res = await gunService.getDraftGuns()
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((d) => combined.push({ ...d, isDbDraft: true }))
        }
      } catch (err) {
        console.warn('Could not fetch server drafts:', err)
      }

      // 2. Local storage drafts
      const localDraftIds = getAllDraftIds()
      localDraftIds.forEach((id) => {
        const d = loadDraft(id)
        if (d) {
          combined.push({
            id: `local-draft-${id}`,
            draftId: id,
            name: d.formData?.name || `Unsaved Hardware (${id})`,
            caliber: d.formData?.caliber || 'Custom',
            price: d.formData?.price || 0,
            type: d.formData?.type || 'Pistol',
            image_url:
              (d.images && d.images[0]) ||
              d.uploadedImageUrl ||
              d.imagePreview ||
              '/guns/pistol.svg',
            savedAt: d.savedAt,
            isLocalDraft: true,
          })
        }
      })

      setDraftsList(combined)
    } finally {
      setLoadingDrafts(false)
    }
  }, [])

  // Load Archived products (FEATURE 7)
  const loadArchived = useCallback(async () => {
    try {
      setLoadingArchived(true)
      const res = await gunService.getArchivedGuns()
      if (res.success && Array.isArray(res.data)) {
        setArchivedList(res.data)
      }
    } finally {
      setLoadingArchived(false)
    }
  }, [])

  useEffect(() => {
    reloadProfile()
    loadAllDrafts()
    loadArchived()

    const handleProfileUpdate = () => setProfile(userService.getUserProfile())
    window.addEventListener('profile-updated', handleProfileUpdate)
    window.addEventListener('products-updated', () => {
      loadAllDrafts()
      loadArchived()
    })

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [reloadProfile, loadAllDrafts, loadArchived])

  // Copy User UUID
  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Publish Draft (FEATURE 6)
  const handlePublishDraft = async (draft) => {
    try {
      if (draft.isDbDraft) {
        await gunService.publishDraft(draft.id)
      } else {
        // Publish local draft
        await gunService.createGun({
          name: draft.name,
          type: draft.type,
          caliber: draft.caliber,
          price: draft.price,
          image_url: draft.image_url,
          images: [draft.image_url],
          status: 'published',
        })
        if (draft.draftId) deleteDraft(draft.draftId)
      }
      setFeedback(`Published "${draft.name}" to active armory catalog!`)
      loadAllDrafts()
      setTimeout(() => setFeedback(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to publish draft.')
    }
  }

  // Discard Draft
  const handleDiscardDraft = (draft) => {
    if (draft.isLocalDraft && draft.draftId) {
      deleteDraft(draft.draftId)
    } else if (draft.isDbDraft) {
      gunService.deleteGun(draft.id)
    }
    loadAllDrafts()
  }

  // Restore Archived Weapon (FEATURE 7)
  const handleRestore = async (gun) => {
    try {
      await gunService.restoreGun(gun.id)
      setFeedback(`Restored "${gun.name}" to public catalog stock.`)
      loadArchived()
      setTimeout(() => setFeedback(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to restore hardware.')
    }
  }

  // Permanent Delete Confirmation (FEATURE 7)
  const handleExecutePermanentDelete = async () => {
    if (!permanentDeleteTarget) return
    try {
      setDeletingPermanent(true)
      await gunService.deleteGun(permanentDeleteTarget.id)
      setPermanentDeleteTarget(null)
      loadArchived()
      setFeedback(`Permanently deleted "${permanentDeleteTarget.name}".`)
      setTimeout(() => setFeedback(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to permanently delete record.')
    } finally {
      setDeletingPermanent(false)
    }
  }

  return (
    <div className="profile-page">
      <section className="masthead profile-masthead">
        <div>
          <h1 className="display">Operator Headquarters</h1>
          <p className="lede">
            Armorer profile, station contact specifications, offline drafts, and archived stock.
          </p>
        </div>
        <div className="profile-masthead-actions">
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
          {/* FEATURE 6: Prominent Edit Profile Button */}
          {onNavigateEditProfile && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onNavigateEditProfile}
              title="Edit Operator profile details"
            >
              <Edit3 size={15} /> Edit Profile
            </button>
          )}
        </div>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Operator Summary Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={38} stroke="var(--brass)" />
              </div>
            )}
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Operator Delta'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Copy User ID to clipboard"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="profile-sub-tag">Certified Bench Armorer · Bore &amp; Barrel</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item" onClick={() => setActiveSection('about')}>
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item" onClick={() => setActiveSection('drafts')}>
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{draftsList.length}</div>
            <div className="stat-label">Pending Drafts</div>
          </div>
          <div className="stat-item" onClick={() => setActiveSection('archived')}>
            <Archive size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{archivedList.length}</div>
            <div className="stat-label">Archived Hardware</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="profile-nav-tabs">
        <button
          type="button"
          className={`tab-btn ${activeSection === 'about' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveSection('about')}
        >
          About &amp; Contact
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSection === 'drafts' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveSection('drafts')}
        >
          Drafts ({draftsList.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSection === 'archived' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveSection('archived')}
        >
          Archived Records ({archivedList.length})
        </button>
      </div>

      {/* SECTION A & B: About & Contact (FEATURE 6) */}
      {activeSection === 'about' && (
        <div className="profile-section-group">
          {/* Section A: About */}
          <div className="card-box">
            <h2 className="card-box-title">About the Armorer &amp; Workshop</h2>
            <div className="about-content-block">
              <p className="about-bio-lead">
                {profile.bio ||
                  'Lead armorer and certified weapons technician. Specializes in striker-fired sidearms and tactical carbine platforms.'}
              </p>

              {/* Integrated original About content */}
              <div className="armory-credo">
                <h3 className="display">A ONE-ROOM ARMORY</h3>
                <p>
                  Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced
                  from the bench — no markup theatre, no filler. Every unit in the catalog is
                  inspected, measured, and verified before entry.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Contact */}
          <div className="card-box">
            <h2 className="card-box-title">Station Contact &amp; Procurement</h2>
            <div className="contact-grid">
              <div className="contact-item">
                <MapPin size={20} className="contact-icon" />
                <div>
                  <span className="contact-label">Armory Location</span>
                  <span className="contact-val">{profile.station_address || '123 Range Road'}</span>
                </div>
              </div>

              <div className="contact-item">
                <Clock size={20} className="contact-icon" />
                <div>
                  <span className="contact-label">Bench Hours</span>
                  <span className="contact-val">
                    {profile.operating_hours || 'Tuesday to Saturday, 10 to 6'}
                  </span>
                </div>
              </div>

              <div className="contact-item">
                <Phone size={20} className="contact-icon" />
                <div>
                  <span className="contact-label">Telephone</span>
                  <span className="contact-val">
                    {profile.contact_phone || '(555) 010-0100'}
                  </span>
                </div>
              </div>

              <div className="contact-item">
                <Mail size={20} className="contact-icon" />
                <div>
                  <span className="contact-label">Direct Inquiries</span>
                  <span className="contact-val">
                    {profile.contact_email || 'armory@boreandbarrel.com'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: Drafts (FEATURE 6) */}
      {activeSection === 'drafts' && (
        <div className="profile-section-group">
          <div className="list-head">
            <div>
              <h2>Catalog Drafts</h2>
              <p className="section-sub">
                In-progress catalog listings. Drafts are private and do not appear in the public catalog.
              </p>
            </div>
            {onNavigateCreateGun && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={onNavigateCreateGun}
              >
                + New Draft
              </button>
            )}
          </div>

          {loadingDrafts ? (
            <div className="state-box">
              <p>Loading drafts…</p>
            </div>
          ) : draftsList.length > 0 ? (
            <ul className="drafts-list">
              {draftsList.map((d) => (
                <li key={d.id} className="draft-card">
                  <LazyImage
                    src={d.image_url || '/guns/pistol.svg'}
                    alt={d.name}
                    className="draft-thumb"
                    fallbackSrc="/guns/pistol.svg"
                  />
                  <div className="draft-info">
                    <h3 className="display draft-title">{d.name}</h3>
                    <p className="draft-meta">
                      {d.type} · {d.caliber} · {formatPrice(d.price)}
                    </p>
                    <span className="draft-ts">
                      {d.savedAt ? `Saved ${formatDraftTime(d.savedAt)}` : 'Draft'}
                    </span>
                  </div>

                  <div className="draft-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => {
                        if (onNavigateEditGun) onNavigateEditGun(d)
                        else if (onNavigateCreateGun) onNavigateCreateGun()
                      }}
                      title="Continue editing this draft"
                    >
                      <ExternalLink size={14} /> Continue Editing
                    </button>

                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handlePublishDraft(d)}
                      title="Publish to public armory catalog"
                    >
                      <Upload size={14} /> Publish
                    </button>

                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDiscardDraft(d)}
                      title="Discard draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="state-box">
              <FileText size={32} stroke="var(--steel)" />
              <p>No active drafts. Start creating a product to save drafts offline.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION D: Archived Hardware (FEATURE 7: Soft Delete / Archive System) */}
      {activeSection === 'archived' && (
        <div className="profile-section-group">
          <div className="list-head">
            <div>
              <h2>Archived Hardware Catalog</h2>
              <p className="section-sub">
                Soft-deleted weapons removed from public display. Can be safely restored or permanently eliminated.
              </p>
            </div>
          </div>

          {loadingArchived ? (
            <div className="state-box">
              <p>Loading archived records…</p>
            </div>
          ) : archivedList.length > 0 ? (
            <ul className="archived-list">
              {archivedList.map((gun) => (
                <li key={gun.id} className="archived-card">
                  <LazyImage
                    src={gun.image_url || '/guns/pistol.svg'}
                    alt={gun.name}
                    className="archived-thumb"
                    fallbackSrc="/guns/pistol.svg"
                  />
                  <div className="archived-info">
                    <div className="archived-status-badge">ARCHIVED</div>
                    <h3 className="display archived-title">{gun.name}</h3>
                    <p className="archived-meta">
                      {gun.type} · {gun.caliber} · {formatPrice(gun.price)}
                    </p>
                    <span className="archived-ts">
                      Archived on{' '}
                      {gun.deleted_at
                        ? new Date(gun.deleted_at).toLocaleDateString()
                        : 'Previous Session'}
                    </span>
                  </div>

                  <div className="archived-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handleRestore(gun)}
                      title="Restore to active catalog"
                    >
                      <RotateCcw size={14} /> Restore to Stock
                    </button>

                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => setPermanentDeleteTarget(gun)}
                      title="Permanently remove from database"
                    >
                      <Trash2 size={14} /> Permanent Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="state-box">
              <Archive size={32} stroke="var(--steel)" />
              <p>No archived hardware records found. Active catalog is healthy.</p>
            </div>
          )}
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal (FEATURE 7) */}
      <ConfirmModal
        open={Boolean(permanentDeleteTarget)}
        title="Permanent Hardware Deletion"
        message={`WARNING: Are you sure you want to PERMANENTLY delete "${permanentDeleteTarget?.name}"? This action cannot be undone. All database records, specifications, images, and reviews will be removed permanently.`}
        confirmLabel="Permanent Delete"
        danger
        loading={deletingPermanent}
        onConfirm={handleExecutePermanentDelete}
        onCancel={() => setPermanentDeleteTarget(null)}
      />
    </div>
  )
}
