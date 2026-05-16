'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './auth-context'
import { fetchWishlistItems, toggleWishlistApi } from './api'
import { toast } from 'react-toastify'

interface WishlistContextType {
  wishlistIds: Array<string | number>
  toggleWishlist: (productId: string | number) => { ids: Array<string | number>, added: boolean }
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const WISHLIST_KEY_PREFIX = "wishlist:"

function keyForGuest(): string {
  return `${WISHLIST_KEY_PREFIX}guest`
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Array<string | number>>([])
  const [mounted, setMounted] = useState(false)
  const { role } = useAuth()
  const isCustomer = role === 'CUSTOMER'
  const prevAuthRef = useRef(false)

  useEffect(() => {
    async function initWishlist() {
      if (isCustomer) {
        const guestKey = keyForGuest()
        const savedWishlistStr = localStorage.getItem(guestKey)
        const savedWishlist = savedWishlistStr ? JSON.parse(savedWishlistStr) : []

        try {
          // If they just logged in and had local items, merge them to backend
          if (!prevAuthRef.current && savedWishlist.length > 0) {
            for (const id of savedWishlist) {
              await toggleWishlistApi(String(id)).catch((err) => {
                console.warn('Failed to sync wishlist item:', err)
              })
            }
            localStorage.removeItem(guestKey)
            toast.success("Guest wishlist synced to your account!")
          }

          // Fetch backend wishlist
          const data = await fetchWishlistItems()
          const mappedIds = data.items.map(item => item.productId)
          setWishlistIds(mappedIds)
        } catch (err) {
          console.error('Failed to initialize wishlist from backend:', err)
        }
      } else {
        // Guest user: load from localStorage
        const guestKey = keyForGuest()
        const savedWishlist = localStorage.getItem(guestKey)
        if (savedWishlist) {
          try {
            setWishlistIds(JSON.parse(savedWishlist))
          } catch (error) {
            console.error('Failed to load wishlist from localStorage', error)
          }
        } else {
          setWishlistIds([])
        }
      }

      prevAuthRef.current = isCustomer
      setMounted(true)
    }

    initWishlist()
  }, [isCustomer])

  // Save wishlist to localStorage whenever it changes (only for guests)
  useEffect(() => {
    if (mounted && !isCustomer) {
      localStorage.setItem(keyForGuest(), JSON.stringify(wishlistIds))
    }
  }, [wishlistIds, mounted, isCustomer])

  const toggleWishlist = (productId: string | number) => {
    const prev = wishlistIds
    const exists = prev.includes(String(productId)) || prev.includes(Number(productId))
    const next = exists
      ? prev.filter((id) => String(id) !== String(productId) && Number(id) !== Number(productId))
      : [...prev, String(productId)]

    // Optimistic UI
    setWishlistIds(next)

    if (isCustomer) {
      // Fire-and-forget API call; revert only if backend fails and the current
      // client state still matches the optimistic state (avoids clobbering
      // subsequent user actions).
      toggleWishlistApi(String(productId)).catch((err: any) => {
        setWishlistIds((cur) => {
          try {
            if (JSON.stringify(cur) === JSON.stringify(next)) return prev
          } catch (e) {
            // fallback: if serialization fails, conservatively do not overwrite
          }
          return cur
        })
        toast.error(err?.message || 'Failed to update wishlist')
      })
    }

    return { ids: next, added: !exists }
  }

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
