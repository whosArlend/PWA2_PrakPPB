import { apiClient, IS_SUPABASE } from '../config/api'
import GUNS_LOCAL from '../data/guns'

const LOCAL_PRODUCTS_KEY = 'bore_barrel_products_store'

// ---------------------------------------------------------------------------
// Local Persistent Storage Helpers
// ---------------------------------------------------------------------------
const getStoredProducts = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    /* fallback to initial seed */
  }
  // Initialize with initial stock
  const initial = GUNS_LOCAL.map((g, idx) => ({
    ...g,
    id: g.id || idx + 1,
    status: g.status || 'published',
    images: g.images || [g.image_url || g.image || '/guns/pistol.svg'],
  }))
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(initial))
  } catch {
    /* quota */
  }
  return initial
}

const saveStoredProducts = (products) => {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products))
    window.dispatchEvent(new Event('products-updated'))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape across Supabase, REST API, & Local
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps.map((st) => (typeof st === 'string' ? st : st.instruction || ''))
      : [
          'Verify firearm is completely unloaded and point in safe direction.',
          'Inspect receiver and mechanism for maintenance.',
        ]

  // Resolve multiple images (FEATURE 1)
  let imagesList = []
  if (Array.isArray(item.product_images) && item.product_images.length > 0) {
    imagesList = item.product_images
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((img) => img.image_url || img)
  } else if (Array.isArray(item.images) && item.images.length > 0) {
    imagesList = item.images.map((img) => (typeof img === 'string' ? img : img.image_url))
  } else {
    const primary = item.image_url || item.image || '/guns/pistol.svg'
    imagesList = [primary]
  }

  const primaryImage = imagesList[0] || item.image_url || item.image || '/guns/pistol.svg'

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: primaryImage,
    image: primaryImage,
    images: imagesList,
    ingredients: specsList,
    steps: stepsList,
    status: item.status || 'published', // 'published' | 'draft' | 'archived'
    deleted_at: item.deleted_at || null,
    created_at: item.created_at || new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints with Supabase + LocalStore fallback
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products.
   * Default status is 'published' for public catalog.
   */
  async getGuns(params = {}) {
    const status = params.status || 'published'
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Number(params.limit) || 6)

    if (IS_SUPABASE) {
      try {
        const queryParts = [
          'select=*,product_images(id,image_url,display_order)',
        ]

        if (status !== 'all') {
          queryParts.push(`status=eq.${encodeURIComponent(status)}`)
        }

        if (params.search) {
          queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
        }

        if (params.category && params.category !== 'All') {
          queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
        }

        if (params.sort_by) {
          const order = params.order === 'desc' ? 'desc' : 'asc'
          queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
        } else {
          queryParts.push('order=created_at.desc')
        }

        const offset = (page - 1) * limit
        queryParts.push(`limit=${limit}`)
        queryParts.push(`offset=${offset}`)

        const queryString = queryParts.join('&')
        const data = await apiClient.get(`/rest/v1/products?${queryString}`, {
          headers: {
            Prefer: 'count=exact',
          },
        })

        const list = Array.isArray(data) ? data.map(normalizeProduct) : []

        // Total count (estimated or headers)
        return {
          success: true,
          data: list,
          pagination: {
            total: list.length >= limit ? page * limit + 1 : (page - 1) * limit + list.length,
            page,
            limit,
            totalPages: Math.ceil(
              (list.length >= limit ? page * limit + 1 : (page - 1) * limit + list.length) / limit,
            ),
          },
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local persistent store:', err)
      }
    }

    // --- Persistent Local Storage Flow ---
    let all = getStoredProducts().map(normalizeProduct)

    // Filter by status
    if (status !== 'all') {
      all = all.filter((g) => (g.status || 'published') === status)
    }

    // Filter by search
    if (params.search) {
      const q = params.search.toLowerCase()
      all = all.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.caliber.toLowerCase().includes(q),
      )
    }

    // Filter by category
    if (params.category && params.category !== 'All') {
      all = all.filter((g) => g.type.toLowerCase() === params.category.toLowerCase())
    }

    // Sort
    const sortKey = params.sort_by || 'created_at'
    const sortOrder = params.order === 'desc' ? 'desc' : 'asc'
    all.sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]
      if (sortKey === 'price') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const startIndex = (safePage - 1) * limit
    const paginated = all.slice(startIndex, startIndex + limit)

    return {
      success: true,
      data: paginated,
      pagination: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
    }
  }

  /**
   * Fetch a single product by ID (including all multiple images).
   */
  async getGunById(id) {
    if (!id) throw new Error('Product ID required.')

    if (IS_SUPABASE) {
      try {
        const data = await apiClient.get(
          `/rest/v1/products?id=eq.${id}&select=*,product_images(id,image_url,display_order)`,
        )
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeProduct(data[0]) }
        }
      } catch (err) {
        console.warn('Supabase getGunById failed, checking local store:', err)
      }
    }

    // Local Store lookup
    const all = getStoredProducts().map(normalizeProduct)
    const match = all.find((g) => String(g.id) === String(id))
    if (match) {
      return { success: true, data: match }
    }

    throw new Error('Hardware piece not found.')
  }

  /**
   * Create a new product with multiple images and status.
   */
  async createGun(data) {
    const specsArray = Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
      : Array.isArray(data.specs)
      ? data.specs
      : []

    const imagesArray = Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : [data.image_url || '/guns/pistol.svg']

    const primaryImage = imagesArray[0] || '/guns/pistol.svg'

    const payload = {
      name: data.name,
      type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
      caliber: data.caliber || '9mm',
      price: Number(data.price ?? data.cook_time ?? 0),
      description: data.description || '',
      specs: specsArray,
      steps: data.steps || [],
      image_url: primaryImage,
      status: data.status || 'published', // 'published' | 'draft' | 'archived'
      is_featured: Boolean(data.is_featured),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (IS_SUPABASE) {
      try {
        const res = await apiClient.post('/rest/v1/products', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = Array.isArray(res) ? res[0] : res

        // Insert multiple images into product_images
        if (created?.id && imagesArray.length > 0) {
          const imageRows = imagesArray.map((imgUrl, order) => ({
            product_id: created.id,
            image_url: imgUrl,
            display_order: order,
          }))
          try {
            await apiClient.post('/rest/v1/product_images', imageRows, {
              headers: { Prefer: 'return=minimal' },
            })
          } catch (imgErr) {
            console.warn('Could not insert product_images rows:', imgErr)
          }
        }

        created.images = imagesArray
        return { success: true, data: normalizeProduct(created) }
      } catch (err) {
        console.warn('Supabase createGun failed, storing locally:', err)
      }
    }

    // Local Storage save
    const all = getStoredProducts()
    const newId = Date.now()
    const newRecord = {
      ...payload,
      id: newId,
      images: imagesArray,
      ingredients: data.ingredients || [],
    }
    all.unshift(newRecord)
    saveStoredProducts(all)

    return { success: true, data: normalizeProduct(newRecord) }
  }

  /**
   * Update an existing product.
   */
  async updateGun(id, data) {
    const specsArray = Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
      : Array.isArray(data.specs)
      ? data.specs
      : undefined

    const imagesArray = Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : data.image_url
      ? [data.image_url]
      : undefined

    const payload = {
      updated_at: new Date().toISOString(),
    }

    if (data.name !== undefined) payload.name = data.name
    if (data.type !== undefined) payload.type = data.type
    if (data.caliber !== undefined) payload.caliber = data.caliber
    if (data.price !== undefined || data.cook_time !== undefined) {
      payload.price = Number(data.price ?? data.cook_time ?? 0)
    }
    if (data.description !== undefined) payload.description = data.description
    if (specsArray !== undefined) payload.specs = specsArray
    if (data.steps !== undefined) payload.steps = data.steps
    if (data.status !== undefined) payload.status = data.status
    if (data.is_featured !== undefined) payload.is_featured = Boolean(data.is_featured)
    if (imagesArray !== undefined) {
      payload.image_url = imagesArray[0]
    }

    if (IS_SUPABASE) {
      try {
        const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
          headers: { Prefer: 'return=representation' },
        })
        const updated = Array.isArray(res) ? res[0] : res

        // Replace product_images
        if (imagesArray) {
          try {
            await apiClient.delete(`/rest/v1/product_images?product_id=eq.${id}`)
            const imageRows = imagesArray.map((imgUrl, order) => ({
              product_id: Number(id),
              image_url: imgUrl,
              display_order: order,
            }))
            await apiClient.post('/rest/v1/product_images', imageRows, {
              headers: { Prefer: 'return=minimal' },
            })
          } catch (imgErr) {
            console.warn('Could not update product_images:', imgErr)
          }
        }

        updated.images = imagesArray || updated.images
        return { success: true, data: normalizeProduct(updated) }
      } catch (err) {
        console.warn('Supabase updateGun failed, updating locally:', err)
      }
    }

    // Local Storage update
    const all = getStoredProducts()
    const index = all.findIndex((g) => String(g.id) === String(id))
    if (index > -1) {
      const existing = all[index]
      all[index] = {
        ...existing,
        ...payload,
        images: imagesArray || existing.images || [existing.image_url],
        ingredients: data.ingredients || existing.ingredients,
      }
      saveStoredProducts(all)
      return { success: true, data: normalizeProduct(all[index]) }
    }

    throw new Error('Hardware piece not found for update.')
  }

  /**
   * FEATURE 7: Soft Delete / Archive a product.
   */
  async archiveGun(id) {
    return this.updateGun(id, {
      status: 'archived',
      deleted_at: new Date().toISOString(),
    })
  }

  /**
   * FEATURE 7: Restore an archived product to published status.
   */
  async restoreGun(id) {
    return this.updateGun(id, {
      status: 'published',
      deleted_at: null,
    })
  }

  /**
   * FEATURE 6: Publish a draft product.
   */
  async publishDraft(id) {
    return this.updateGun(id, {
      status: 'published',
      deleted_at: null,
    })
  }

  /**
   * FEATURE 7: Permanent Delete — physically remove from database & storage.
   */
  async deleteGun(id) {
    if (IS_SUPABASE) {
      try {
        await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      } catch (err) {
        console.warn('Supabase deleteGun error:', err)
      }
    }

    const all = getStoredProducts()
    const filtered = all.filter((g) => String(g.id) !== String(id))
    saveStoredProducts(filtered)
    return { success: true }
  }

  /**
   * Get all archived products (FEATURE 7)
   */
  async getArchivedGuns() {
    return this.getGuns({ status: 'archived', limit: 100 })
  }

  /**
   * Get all draft products (FEATURE 6)
   */
  async getDraftGuns() {
    return this.getGuns({ status: 'draft', limit: 100 })
  }
}

export default new GunService()
