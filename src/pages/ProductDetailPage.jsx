import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useGunById, useProductMutations } from '../hooks/useGuns'
import GunDetail from '../components/gun/GunDetail'
import { PageLoadingSkeleton } from '../components/common/LoadingSkeleton'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * ProductDetailPage (FEATURE 5: Unique & Stable Product URLs)
 * Supports direct links: /product/:id
 */
export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { gun, loading, error } = useGunById(id)
  const { archiveGun } = useProductMutations()

  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      setArchiving(true)
      await archiveGun(archiveTarget.id)
      setArchiveTarget(null)
      navigate('/catalog')
    } catch (err) {
      alert(err.message || 'Failed to archive.')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton message="Retrieving Hardware Specifications…" />
  }

  if (error || !gun) {
    return (
      <div className="state-box state-box--error">
        <h2>Hardware Record Not Found</h2>
        <p>{error || `No weapon record corresponds to reference identifier "${id}".`}</p>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => navigate('/catalog')}
          style={{ marginTop: '16px' }}
        >
          <ArrowLeft size={16} /> Return to Armory Catalog
        </button>
      </div>
    )
  }

  return (
    <>
      <GunDetail
        gun={gun}
        onBack={() => navigate('/catalog')}
        onEdit={() => navigate(`/hardware/edit/${gun.id}`)}
        onArchive={() => setArchiveTarget(gun)}
        onDelete={() => setArchiveTarget(gun)}
      />

      <ConfirmModal
        open={Boolean(archiveTarget)}
        title="Archive Hardware Record"
        message={`Are you sure you want to archive "${gun.name}"? It will be removed from the public catalog and moved to your Archived records.`}
        confirmLabel="Archive"
        danger
        loading={archiving}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  )
}

