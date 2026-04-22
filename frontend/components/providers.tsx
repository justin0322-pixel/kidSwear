'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { api, setApiToken } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useNotifications } from '@/hooks/use-notifications'
import { Toaster } from '@/components/ui/toaster'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

function NotificationsInitializer() {
  useNotifications()
  return null
}

function AuthInitializer({ children }: { children: import('react').ReactNode }) {
  const { setAuth, setInitialized } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // 用原始 axios 呼叫，避免觸發 api interceptor 的無限循環
    axios
      .post<{ data: { accessToken: string } }>(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(async (res) => {
        const token = res.data.data.accessToken
        setApiToken(token)
        const me = await api.get<{ data: { id: string; email: string; role: 'wholesaler' | 'retailer' | 'admin' } }>('/auth/me')
        setAuth(me.data.data, token)
      })
      .catch(() => {
        // No valid session — stay logged out
      })
      .finally(() => setInitialized())
  }, [setAuth, setInitialized])

  return <>{children}</>
}

export function Providers({ children }: { children: import('react').ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <NotificationsInitializer />
        {children}
      </AuthInitializer>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
