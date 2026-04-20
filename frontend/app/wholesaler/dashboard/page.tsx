'use client'

import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { useShopStats } from '@/hooks/use-shop'

const NAV_ITEMS = [
  { label: '商品管理', desc: '新增、編輯、刪除商品', href: '/wholesaler/products', icon: '📦' },
  { label: '訂單管理', desc: '處理訂單、更新出貨狀態', href: '/wholesaler/orders', icon: '📋' },
  { label: '商城設定', desc: '名稱、介紹、Logo', href: '/wholesaler/shop', icon: '🏪' },
  { label: '標籤管理', desc: '管理商品分類標籤', href: '/wholesaler/tags', icon: '🏷️' },
]

export default function WholesalerDashboard() {
  const router = useRouter()
  const { data: stats } = useShopStats()

  const STAT_CARDS = [
    { label: '今日訂單', value: stats ? String(stats.todayOrders) : '—' },
    {
      label: '本月營收',
      value: stats ? `NT$${Number(stats.monthRevenue).toLocaleString('zh-TW')}` : '—',
    },
    { label: '商品數量', value: stats ? String(stats.productCount) : '—' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 統計卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className="bg-white rounded-lg border p-6">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        {/* 功能導覽 */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">快速入口</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className="bg-white rounded-lg border p-5 text-left hover:border-gray-400 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-gray-700">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
