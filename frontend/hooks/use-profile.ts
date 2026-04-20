'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type UserProfile = {
  id: string
  email: string
  role: 'wholesaler' | 'retailer' | 'admin'
  profile: {
    shopName?: string
    contactPerson?: string
    shippingAddress?: string
    companyName?: string
  } | null
}

type UpdateProfilePayload = {
  shopName?: string
  contactPerson?: string
  shippingAddress?: string
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<{ data: UserProfile }>('/auth/me')
      return res.data.data
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await api.put<{ data: UserProfile }>('/auth/profile', payload)
      return res.data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated)
    },
  })
}
