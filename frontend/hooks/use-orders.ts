'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type OrderItem = {
  id: number
  variantId: number
  quantity: number
  unitPrice: string
  subtotal: string
  size: string
  color: string
  sku: string
  productName: string
  productId: number
}

export type Order = {
  id: number
  orderNumber: string
  status: OrderStatus
  total: string
  createdAt: string
  shippingAddress: string
  contactName: string
  contactPhone: string
  retailerNote: string | null
  wholesalerNote: string | null
  paidAt: string | null
  shippedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  shop: { id: number; name: string }
  retailer: { id: number; shopName: string }
  itemCount: number
}

export type OrderDetail = Order & {
  items: OrderItem[]
}

type OrdersApiResponse = {
  data: Order[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

type OrdersResponse = {
  items: Order[]
  total: number
  page: number
  pageSize: number
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待付款',
  paid: '已付款',
  processing: '備貨中',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
}

export const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-red-100 text-red-600',
}

// 批發商可執行的狀態轉換
export const WHOLESALER_TRANSITIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }[]>> = {
  pending: [{ next: 'paid', label: '標記已付款' }],
  paid: [
    { next: 'processing', label: '開始備貨' },
    { next: 'refunded', label: '退款' },
  ],
  processing: [{ next: 'shipped', label: '標記已出貨' }],
  shipped: [{ next: 'completed', label: '確認完成' }],
}

export function useOrders(params: { page?: number; status?: string } = {}) {
  const { page = 1, status } = params
  return useQuery({
    queryKey: ['orders', { page, status }],
    queryFn: async () => {
      const res = await api.get<OrdersApiResponse>('/orders', {
        params: { page, pageSize: 20, ...(status && { status }) },
      })
      const { data: items, pagination } = res.data
      return { items, total: pagination.total, page: pagination.page, pageSize: pagination.pageSize }
    },
  })
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<{ data: OrderDetail }>(`/orders/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useUpdateOrderStatus(orderId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { status: OrderStatus; note?: string }) => {
      const res = await api.patch<{ data: OrderDetail }>(
        `/orders/${orderId}/status`,
        payload,
      )
      return res.data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
