'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type Shop = {
  id: number
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  minOrderAmount: string
}

type UpdateShopPayload = {
  name?: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  minOrderAmount?: string
}

export function useMyShop() {
  return useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const res = await api.get<{ data: Shop }>('/shops/my')
      return res.data.data
    },
  })
}

export type ShopStats = {
  todayOrders: number
  monthRevenue: string
  productCount: number
}

export function useShopStats() {
  return useQuery({
    queryKey: ['shop-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: ShopStats }>('/shops/my/stats')
      return res.data.data
    },
  })
}

export function useUpdateMyShop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateShopPayload) => {
      const res = await api.put<{ data: Shop }>('/shops/my', payload)
      return res.data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-shop'], updated)
    },
  })
}
