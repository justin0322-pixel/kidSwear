'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type RevenueDay = { date: string; revenue: string; orderCount: number }

export type TopProduct = {
  id: string
  name: string
  orderCount: number
  totalQuantity: number
  revenue: string
}

export type TopRetailer = {
  id: string
  shopName: string
  orderCount: number
  totalAmount: string
}

export type AnalyticsData = {
  revenueByDay: RevenueDay[]
  topProducts: TopProduct[]
  topRetailers: TopRetailer[]
  orderStatusCounts: Record<string, number>
}

export function useShopAnalytics() {
  return useQuery({
    queryKey: ['shop-analytics'],
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsData }>('/shops/my/analytics')
      return res.data.data
    },
  })
}
