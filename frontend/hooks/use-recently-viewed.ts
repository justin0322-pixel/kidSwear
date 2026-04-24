'use client'

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'kidswear_recently_viewed'
const MAX_ITEMS = 10

export type RecentProduct = {
  id: number
  name: string
  basePrice: string
  primaryImageUrl: string | null
  shopName: string
  shopSlug: string
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored) as RecentProduct[])
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  const trackView = useCallback((product: RecentProduct) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id)
      const next = [product, ...filtered].slice(0, MAX_ITEMS)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  return { items: hydrated ? items : [], trackView }
}
