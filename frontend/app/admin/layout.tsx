'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'

const NAV = [
  { label: '系統總覽', href: '/admin/dashboard' },
  { label: '使用者管理', href: '/admin/users' },
  { label: '商城管理', href: '/admin/shops' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) return
    if (!user || user.role !== 'admin') router.replace('/login')
  }, [user, isInitialized, router])

  if (!isInitialized || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">管理後台</span>
          <nav className="flex items-center gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <span className="text-xs text-gray-400">{user.email}</span>
      </header>

      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}
