'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const role = searchParams.get('role') as 'wholesaler' | 'retailer' | null
    const redirect = searchParams.get('redirect')
    const isNew = searchParams.get('new') === '1'

    if (!token || !role) {
      router.replace('/login?error=oauth_failed')
      return
    }

    // Store token in auth store (email unknown at this point, will be fetched on next /me call)
    setAuth({ id: '', email: '', role }, token)

    if (isNew) {
      router.replace('/retailer/onboarding')
    } else if (redirect) {
      router.replace(decodeURIComponent(redirect))
    } else {
      router.replace(role === 'wholesaler' ? '/wholesaler/dashboard' : '/retailer/home')
    }
  }, [searchParams, setAuth, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">正在登入...</p>
      </div>
    </div>
  )
}
