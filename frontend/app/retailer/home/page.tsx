'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export default function RetailerHome() {
  const { user, clear } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    const { api } = await import('@/lib/api')
    await api.post('/auth/logout').catch(() => null)
    clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">零售商首頁</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>登出</Button>
      </header>
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '待處理訂單', value: '0' },
            { label: '本月消費', value: 'NT$0' },
            { label: '收藏商品', value: '0' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg border p-6">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-gray-400">首頁開發中，敬請期待</p>
      </main>
    </div>
  )
}
