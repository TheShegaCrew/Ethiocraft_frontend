'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './auth-context'
import {
  fetchCartItems,
  addToCartApi,
  updateCartItemApi,
  removeFromCartApi,
  clearCartApi
} from './api'
import { toast } from 'react-toastify'

export interface CartItem {
  id: string | number
  name: string
  price: number
  image: string
  quantity: number
  category: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string | number) => void
  updateQuantity: (id: string | number, quantity: number) => void
  clearCart: () => void
  cartCount: number
  cartTotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)
  const { role } = useAuth()
  const isCustomer = role === 'CUSTOMER'
  const prevAuthRef = useRef(false)

  // Sync logic
  useEffect(() => {
    async function initCart() {
      if (isCustomer) {
        // If they just logged in, check if we need to sync local cart
        const savedCartStr = localStorage.getItem('cart')
        const savedCart = savedCartStr ? JSON.parse(savedCartStr) : []
        
        try {
          if (!prevAuthRef.current && savedCart.length > 0) {
            // They just logged in and had local items, merge them to backend
            for (const item of savedCart) {
              await addToCartApi(String(item.id), item.quantity).catch((err) => {
                console.warn('Failed to sync item:', err)
              })
            }
            localStorage.removeItem('cart') // clear local after syncing
            toast.success("Guest cart synced to your account!")
          }
          
          // Fetch backend cart
          const data = await fetchCartItems()
          // Map backend format to local format
          const mappedItems = data.items.map(item => ({
            id: item.productId, // Use productId as id to easily match
            name: item.product.title,
            price: Number(item.product.price),
            image: item.product.media?.[0]?.url || "/placeholder-product.jpg",
            quantity: item.quantity,
            category: item.product.category,
          }))
          setItems(mappedItems)
        } catch (err) {
          console.error('Failed to initialize cart from backend:', err)
        }
      } else {
        // Guest user: load from localStorage
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          try {
            setItems(JSON.parse(savedCart))
          } catch (error) {
            console.error('Failed to load cart from localStorage', error)
          }
        } else {
          setItems([]) // clear if they log out
        }
      }
      
      prevAuthRef.current = isCustomer
      setMounted(true)
    }

    initCart()
  }, [isCustomer])

  // Save cart to localStorage whenever it changes (only for guests)
  useEffect(() => {
    if (mounted && !isCustomer) {
      localStorage.setItem('cart', JSON.stringify(items))
    }
  }, [items, mounted, isCustomer])

  const addItem = async (newItem: CartItem) => {
    // Optimistic UI with rollback on failure
    const prevItems = items
    setItems((prevItemsState) => {
      const existingItem = prevItemsState.find((item) => String(item.id) === String(newItem.id))
      if (existingItem) {
        return prevItemsState.map((item) =>
          String(item.id) === String(newItem.id) ? { ...item, quantity: item.quantity + newItem.quantity } : item
        )
      }
      return [...prevItemsState, newItem]
    })

    if (isCustomer) {
      try {
        await addToCartApi(String(newItem.id), newItem.quantity)
      } catch (err: any) {
        // rollback to previous items snapshot
        setItems(prevItems)
        toast.error(err.message || 'Failed to add item to cart')
      }
    }
  }

  const removeItem = async (id: string | number) => {
    setItems((prevItems) => prevItems.filter((item) => String(item.id) !== String(id)))
    
    if (isCustomer) {
      try {
        await removeFromCartApi(String(id))
      } catch (err: any) {
        toast.error(err.message || 'Failed to remove item from cart')
      }
    }
  }

  const updateQuantity = async (id: string | number, quantity: number) => {
    if (quantity < 1) {
      return removeItem(id)
    }
    
    setItems((prevItems) => prevItems.map((item) => (String(item.id) === String(id) ? { ...item, quantity } : item)))

    if (isCustomer) {
      try {
        await updateCartItemApi(String(id), quantity)
      } catch (err: any) {
        toast.error(err.message || 'Failed to update item quantity')
      }
    }
  }

  const clearCart = async () => {
    setItems([])
    if (isCustomer) {
      try {
        await clearCartApi()
      } catch (err: any) {
        toast.error(err.message || 'Failed to clear cart')
      }
    } else {
      localStorage.removeItem('cart')
    }
  }

  const cartCount = items.length
  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
