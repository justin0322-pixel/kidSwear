'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type VipMember = {
  id: string
  retailerId: string
  shopName: string
  email: string
  createdAt: string
}

export type VipDiscount = {
  id: string
  variantId: string
  productId: string
  productName: string
  size: string
  color: string
  discountType: 'percentage' | 'fixed'
  discountValue: string
}

export function useVipMembers() {
  return useQuery({
    queryKey: ['vip-members'],
    queryFn: async () => {
      const res = await api.get<{ data: VipMember[] }>('/shops/my/vip-members')
      return res.data.data
    },
  })
}

export function useAddVipMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      api.post('/shops/my/vip-members', { email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-members'] }),
  })
}

export function useRemoveVipMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (retailerId: string) =>
      api.delete(`/shops/my/vip-members/${retailerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-members'] }),
  })
}

export function useVipDiscounts() {
  return useQuery({
    queryKey: ['vip-discounts'],
    queryFn: async () => {
      const res = await api.get<{ data: VipDiscount[] }>('/shops/my/vip-discounts')
      return res.data.data
    },
  })
}

export function useSetVipDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ variantId, discountType, discountValue }: {
      variantId: string
      discountType: 'percentage' | 'fixed'
      discountValue: number
    }) => api.put(`/shops/my/variants/${variantId}/vip-discount`, { discountType, discountValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-discounts'] }),
  })
}

export function useRemoveVipDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variantId: string) =>
      api.delete(`/shops/my/variants/${variantId}/vip-discount`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-discounts'] }),
  })
}

export function useSetVipMode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isVipOnly: boolean) =>
      api.patch('/shops/my/vip-mode', { isVipOnly }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-shop'] })
    },
  })
}
