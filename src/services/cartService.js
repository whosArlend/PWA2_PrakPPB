// ---------------------------------------------------------------------------
// cartService.js — Shopping Cart & WhatsApp Checkout Engine (FEATURE 9)
// Persists cart in localStorage and generates pre-filled WhatsApp checkout links.
// ---------------------------------------------------------------------------

import { formatPrice } from '../utils/helpers'

const CART_STORAGE_KEY = 'bore_barrel_cart'

// Configurable WhatsApp Contact Number from environment or default placeholder
export const getWhatsAppNumber = () => {
  const envNumber = import.meta.env.VITE_WHATSAPP_NUMBER
  if (envNumber && String(envNumber).trim()) {
    // Strip any +, spaces, hyphens
    return String(envNumber).replace(/[^0-9]/g, '')
  }
  // Clearly marked placeholder
  return '6281234567890'
}

/**
 * Retrieve items currently saved in localStorage
 * @returns {Array} Array of cart items
 */
export const getCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Save items into localStorage
 * @param {Array} items
 */
export const saveCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event('cart-updated'))
    return true
  } catch {
    return false
  }
}

/**
 * Add product to cart with quantity
 * @param {Object} product
 * @param {number} quantity
 */
export const addToCart = (product, quantity = 1) => {
  if (!product) return getCart()
  const items = getCart()
  const pId = String(product.id || product.name)
  const existingIndex = items.findIndex((i) => String(i.id) === pId)

  const primaryImage =
    (product.images && product.images.length > 0
      ? product.images[0].image_url || product.images[0]
      : null) ||
    product.image_url ||
    product.image ||
    '/guns/pistol.svg'

  const price = Number(product.price ?? product.cook_time ?? 0)

  if (existingIndex > -1) {
    items[existingIndex].quantity = Math.max(1, items[existingIndex].quantity + quantity)
  } else {
    items.push({
      id: pId,
      name: product.name || 'Hardware Piece',
      price,
      quantity: Math.max(1, quantity),
      image_url: primaryImage,
      type: product.type || product.category || 'Hardware',
      caliber: product.caliber || '',
    })
  }

  saveCart(items)
  return items
}

/**
 * Update quantity of a product in the cart
 * @param {string|number} productId
 * @param {number} quantity
 */
export const updateCartQuantity = (productId, quantity) => {
  const items = getCart()
  const targetId = String(productId)
  const newQty = Math.max(1, Number(quantity) || 1)

  const updated = items.map((item) => {
    if (String(item.id) === targetId) {
      return { ...item, quantity: newQty }
    }
    return item
  })

  saveCart(updated)
  return updated
}

/**
 * Remove an item from the cart
 * @param {string|number} productId
 */
export const removeFromCart = (productId) => {
  const items = getCart()
  const targetId = String(productId)
  const filtered = items.filter((item) => String(item.id) !== targetId)
  saveCart(filtered)
  return filtered
}

/**
 * Empty the entire cart
 */
export const clearCart = () => {
  saveCart([])
  return []
}

/**
 * Calculate totals for current cart items
 * @param {Array} items
 */
export const calculateTotals = (items = []) => {
  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  )
  const total = subtotal
  const itemCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0)

  return {
    subtotal,
    total,
    itemCount,
  }
}

/**
 * Format the WhatsApp checkout message as required:
 *
 * Hi, aku mau pesan:
 *
 * 1. Glock 19
 *    Quantity: 1
 *    Price: $599
 *
 * Total: $599
 *
 * Mohon informasi lebih lanjut mengenai pesanan saya. Terima kasih!
 *
 * @param {Array} items
 * @returns {string} WhatsApp encoded URL
 */
export const generateWhatsAppCheckoutUrl = (items = []) => {
  if (!items || items.length === 0) return ''

  const { total } = calculateTotals(items)

  const itemsList = items
    .map((item, index) => {
      return `${index + 1}. ${item.name}\n   Quantity: ${item.quantity}\n   Price: ${formatPrice(item.price)}`
    })
    .join('\n\n')

  const message = `Hi, aku mau pesan:\n\n${itemsList}\n\nTotal: ${formatPrice(total)}\n\nMohon informasi lebih lanjut mengenai pesanan saya. Terima kasih!`

  const phone = getWhatsAppNumber()
  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${phone}?text=${encodedMessage}`
}

export default {
  getCart,
  saveCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  calculateTotals,
  generateWhatsAppCheckoutUrl,
  getWhatsAppNumber,
}

