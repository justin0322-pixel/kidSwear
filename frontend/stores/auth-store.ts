'use client'

import { create } from 'zustand'
import { setApiToken } from '@/lib/api'

type UserRole = 'wholesaler' | 'retailer' | 'admin'

type User = {
  id: string
  email: string
  role: UserRole
}

type AuthState = {
  user: User | null
  accessToken: string | null
  isInitialized: boolean
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (token: string) => void
  setInitialized: () => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (user, accessToken) => {
    setApiToken(accessToken)
    set({ user, accessToken })
  },
  setAccessToken: (accessToken) => {
    setApiToken(accessToken)
    set({ accessToken })
  },
  setInitialized: () => set({ isInitialized: true }),
  clear: () => {
    setApiToken(null)
    set({ user: null, accessToken: null })
  },
}))
