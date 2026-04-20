'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { useOrders } from '@/hooks/use-orders'
import { useShops } from '@/hooks/use-shops'
import { Navbar } from '@/components/layout/Navbar'

const QUICK_LINKS = [
  { label: '瀏覽商城', icon: '🏪', href: '/shops' },
  { label: '購物車', icon: '🛒', href: '/retailer/cart' },
  { label: '我的訂單', icon: '📋', href: '/retailer/orders' },
  { label: '個人資料', icon: '👤', href: '/retailer/profile' },
]

export default function RetailerHome() {
  const router = useRouter()
  const { data: cart } = useCart()
  const { data: orders } = useOrders({ status: 'pending' })
  const { data: shopsData } = useShops({ page: 1 })

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const pendingOrderCount = orders?.total ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* 狀態摘要 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push('/retailer/cart')}
            className="bg-white rounded-lg border p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <p className="text-sm text-gray-500">購物車</p>
            <p className="text-2xl font-bold mt-1">{cartCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">件商品</p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/retailer/orders?status=pending')}
            className="bg-white rounded-lg border p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <p className="text-sm text-gray-500">待付款訂單</p>
            <p className="text-2xl font-bold mt-1">{pendingOrderCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">筆</p>
          </button>
        </div>

        {/* 快速入口 */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">快速入口</h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => router.push(link.href)}
                className="bg-white rounded-lg border py-4 flex flex-col items-center gap-2 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-xs text-gray-600">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 推薦商品佔位（AI 推薦開發中）*/}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500">為您推薦</h2>
            <span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
              AI 推薦即將上線
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-200 text-3xl">
                  👕
                </div>
                <div className="p-2 space-y-1">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 熱門商城 */}
        {shopsData && shopsData.data.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500">熱門商城</h2>
              <button
                type="button"
                onClick={() => router.push('/shops')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                查看全部 →
              </button>
            </div>
            <div className="space-y-2">
              {shopsData.data.slice(0, 4).map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => router.push(`/shops/${shop.slug}`)}
                  className="w-full bg-white rounded-lg border px-4 py-3 flex items-center gap-3 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                >
                  {shop.logoUrl ? (
                    <img
                      src={shop.logoUrl}
                      alt={shop.name}
                      className="w-9 h-9 rounded-full object-cover border shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-400 shrink-0">
                      {shop.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{shop.name}</p>
                    <p className="text-xs text-gray-400">{shop._count.products} 件商品</p>
                  </div>
                  <span className="ml-auto text-gray-300 text-sm">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
