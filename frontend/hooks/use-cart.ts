'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type CartItem = {
  variantId: string
  quantity: number
  productId: string
  shopId: string
  productName: string
  primaryImageUrl: string | null
  size: string
  color: string
  sku: string
  unitPrice: string
  subtotal: string
}

type CartResponse = {
  data: {
    items: CartItem[]
    total: string
  }
}

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<CartResponse>('/cart')
      return res.data.data
    },
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { variantId: number; quantity: number }) => {
      await api.post('/cart/items', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { variantId: number; quantity: number }) => {
      await api.put(`/cart/items/${payload.variantId}`, { quantity: payload.quantity })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variantId: number) => {
      await api.delete(`/cart/items/${variantId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
