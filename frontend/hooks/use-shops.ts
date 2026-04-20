'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ShopSummary = {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  minOrderAmount: string
  isActive: boolean
  _count: { products: number }
}

type ShopsResponse = {
  data: ShopSummary[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function useShops(params: { page?: number } = {}) {
  const { page = 1 } = params
  return useQuery({
    queryKey: ['shops', { page }],
    queryFn: async () => {
      const res = await api.get<ShopsResponse>('/shops', { params: { page, pageSize: 20 } })
      return res.data
    },
  })
}

export function useShopBySlug(slug: string) {
  return useQuery({
    queryKey: ['shop', slug],
    queryFn: async () => {
      const res = await api.get<{ data: ShopSummary }>(`/shops/slug/${slug}`)
      return res.data.data
    },
    enabled: !!slug,
  })
}
