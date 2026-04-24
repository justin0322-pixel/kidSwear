'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type CartItem = {
  variantId: string
  quantity: number
  productId: string
  shopId: string
  shopName: string
  shopSlug: string
  productName: string
  primaryImageUrl: string | null
  size: string
  color: string
  sku: string
  unitPrice: string
  subtotal: string
}

export type Cart = {
  items: CartItem[]
  total: string
}

type CartResponse = {
  data: Cart
}

const CART_KEY = ['cart'] as const

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
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
      const res = await api.post<CartResponse>('/cart/items', payload)
      return res.data.data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_KEY, cart)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { variantId: number; quantity: number }) => {
      const res = await api.put<CartResponse>(
        `/cart/items/${payload.variantId}`,
        { quantity: payload.quantity },
      )
      return res.data.data
    },
    onMutate: async ({ variantId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY })
      const prev = queryClient.getQueryData<Cart>(CART_KEY)

      if (prev) {
        const items = prev.items.map((item) =>
          item.variantId === String(variantId)
            ? {
                ...item,
                quantity,
                subtotal: (Number(item.unitPrice) * quantity).toFixed(2),
              }
            : item,
        )
        const total = items.reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2)
        queryClient.setQueryData<Cart>(CART_KEY, { items, total })
      }

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(CART_KEY, ctx.prev)
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_KEY, cart)
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variantId: number) => {
      const res = await api.delete<CartResponse>(`/cart/items/${variantId}`)
      return res.data.data
    },
    onMutate: async (variantId) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY })
      const prev = queryClient.getQueryData<Cart>(CART_KEY)

      if (prev) {
        const items = prev.items.filter((i) => i.variantId !== String(variantId))
        const total = items.reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2)
        queryClient.setQueryData<Cart>(CART_KEY, { items, total })
      }

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(CART_KEY, ctx.prev)
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_KEY, cart)
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/cart')
    },
    onSuccess: () => {
      queryClient.setQueryData<Cart>(CART_KEY, { items: [], total: '0' })
    },
  })
}
