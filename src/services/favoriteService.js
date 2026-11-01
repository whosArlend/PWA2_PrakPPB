import { apiClient, IS_SUPABASE } from '../config/api'
import { normalizeProduct } from './gunService'
import gunService from './gunService'

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event('favorites-updated'))
  } catch {
    /* quota */
  }
}

class FavoriteService {
  /**
   * Retrieve all favourited products for the given user.
   */
  async getFavorites(userIdentifier) {
    if (IS_SUPABASE) {
      try {
        const data = await apiClient.get(
          `/rest/v1/favorites?user_id=eq.${userIdentifier}&select=product_id,created_at,products(*)`,
        )
        if (Array.isArray(data)) {
          const list = data
            .filter((fav) => Boolean(fav.products))
            .map((fav) => ({
              ...normalizeProduct(fav.products),
              id: fav.product_id,
              created_at: fav.created_at,
            }))
          return { success: true, data: list }
        }
      } catch (err) {
        console.warn('Supabase getFavorites error, reading local:', err)
      }
    }

    // Local fallback: map favorite ids to full product records
    const ids = readLocalFavs()
    const { data: allProducts } = await gunService.getGuns({ status: 'all', limit: 200 })
    const list = ids
      .map((id) => allProducts.find((p) => String(p.id) === String(id)))
      .filter(Boolean)

    return { success: true, data: list }
  }

  /**
   * Toggle a product's favourite state.
   */
  async toggleFavorite(data) {
    const targetId = String(data.recipe_id || data.gun_id || data.product_id)
    const userId = data.user_identifier

    if (IS_SUPABASE) {
      try {
        const existing = await apiClient.get(
          `/rest/v1/favorites?product_id=eq.${targetId}&user_id=eq.${userId}&select=*`,
        )

        if (Array.isArray(existing) && existing.length > 0) {
          await apiClient.delete(
            `/rest/v1/favorites?product_id=eq.${targetId}&user_id=eq.${userId}`,
          )
          this.syncLocalToggle(targetId, false)
          return { success: true, data: { is_favorited: false } }
        } else {
          await apiClient.post(
            '/rest/v1/favorites',
            { product_id: Number(targetId) || targetId, user_id: userId },
            { headers: { Prefer: 'return=minimal' } },
          )
          this.syncLocalToggle(targetId, true)
          return { success: true, data: { is_favorited: true } }
        }
      } catch (err) {
        console.warn('Supabase toggleFavorite error, updating local:', err)
      }
    }

    const isFav = this.syncLocalToggle(targetId)
    return { success: true, data: { is_favorited: isFav } }
  }

  syncLocalToggle(targetId, forceState) {
    const current = readLocalFavs()
    const idx = current.findIndex((id) => String(id) === String(targetId))
    let newState

    if (forceState !== undefined) {
      newState = forceState
      if (newState && idx === -1) current.push(targetId)
      if (!newState && idx > -1) current.splice(idx, 1)
    } else {
      if (idx === -1) {
        current.push(targetId)
        newState = true
      } else {
        current.splice(idx, 1)
        newState = false
      }
    }

    writeLocalFavs(current)
    return newState
  }
}

export default new FavoriteService()
