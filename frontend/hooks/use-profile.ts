'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type UserProfile = {
  id: string
  email: string
  role: 'wholesaler' | 'retailer' | 'admin'
  phone: string | null
  profile: {
    shopName?: string
    contactPerson?: string
    shippingAddress?: string
    companyName?: string
  } | null
}

export type OAuthAccount = {
  provider: 'google' | 'line' | 'facebook'
  providerEmail: string | null
  providerName: string | null
  providerAvatar: string | null
  linkedAt: string
}

type UpdateProfilePayload = {
  shopName?: string
  contactPerson?: string
  shippingAddress?: string
  phone?: string
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

export function useOAuthAccounts() {
  return useQuery({
    queryKey: ['oauth-accounts'],
    queryFn: async () => {
      const res = await api.get<{ data: OAuthAccount[] }>('/auth/oauth-accounts')
      return res.data.data
    },
  })
}

export function useUnlinkOAuth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (provider: string) => {
      await api.delete(`/auth/oauth-accounts/${provider}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-accounts'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      await api.put('/auth/password', payload)
    },
  })
}
