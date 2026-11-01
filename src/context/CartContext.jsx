import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getCart,
  addToCart as serviceAddToCart,
  updateCartQuantity as serviceUpdateQty,
  removeFromCart as serviceRemove,
  clearCart as serviceClear,
  calculateTotals,
  generateWhatsAppCheckoutUrl,
  getWhatsAppNumber,
} from '../services/cartService'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(getCart)
  const [totals, setTotals] = useState(() => calculateTotals(getCart()))

  const refreshCart = useCallback(() => {
    const fresh = getCart()
    setItems(fresh)
    setTotals(calculateTotals(fresh))
  }, [])

  useEffect(() => {
    const handleCartEvent = () => refreshCart()
    window.addEventListener('cart-updated', handleCartEvent)
    window.addEventListener('storage', handleCartEvent)
    return () => {
      window.removeEventListener('cart-updated', handleCartEvent)
      window.removeEventListener('storage', handleCartEvent)
    }
  }, [refreshCart])

  const addToCart = (product, quantity = 1) => {
    const updated = serviceAddToCart(product, quantity)
    setItems(updated)
    setTotals(calculateTotals(updated))
    return updated
  }

  const updateQuantity = (productId, quantity) => {
    const updated = serviceUpdateQty(productId, quantity)
    setItems(updated)
    setTotals(calculateTotals(updated))
    return updated
  }

  const removeFromCart = (productId) => {
    const updated = serviceRemove(productId)
    setItems(updated)
    setTotals(calculateTotals(updated))
    return updated
  }

  const clearCart = () => {
    const updated = serviceClear()
    setItems(updated)
    setTotals(calculateTotals(updated))
    return updated
  }

  const getCheckoutUrl = () => {
    return generateWhatsAppCheckoutUrl(items)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal: totals.subtotal,
        total: totals.total,
        itemCount: totals.itemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCheckoutUrl,
        whatsAppNumber: getWhatsAppNumber(),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
