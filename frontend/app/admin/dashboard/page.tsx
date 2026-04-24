'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type AdminStats = {
  totalUsers: number
  wholesalerCount: number
  retailerCount: number
  newUsersToday: number
  totalOrders: number
  pendingOrders: number
  confirmedRevenue: string
  activeShops: number
  activeProducts: number
}

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: AdminStats }>('/admin/stats')
      return res.data.data
    },
    refetchInterval: 60_000,
  })
}

type StatCardProps = {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-5 space-y-1 ${accent ? 'border-blue-200 bg-blue-50/40' : ''}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">系統總覽</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">系統總覽</h1>
        <p className="text-xs text-gray-400">每分鐘自動更新</p>
      </div>

      {/* 使用者統計 */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-3">使用者</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="總使用者數" value={stats.totalUsers.toLocaleString('zh-TW')} />
          <StatCard label="批發商" value={stats.wholesalerCount.toLocaleString('zh-TW')} />
          <StatCard label="零售商" value={stats.retailerCount.toLocaleString('zh-TW')} />
          <StatCard
            label="今日新增"
            value={stats.newUsersToday}
            sub="本日 00:00 起"
            accent={stats.newUsersToday > 0}
          />
        </div>
      </section>

      {/* 訂單統計 */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-3">訂單</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="總訂單數" value={stats.totalOrders.toLocaleString('zh-TW')} />
          <StatCard
            label="待付款訂單"
            value={stats.pendingOrders}
            sub="需批發商確認"
            accent={stats.pendingOrders > 0}
          />
          <StatCard
            label="已確認收入"
            value={`NT$${Number(stats.confirmedRevenue).toLocaleString('zh-TW')}`}
            sub="付款 / 備貨 / 出貨 / 完成"
          />
        </div>
      </section>

      {/* 商品 / 商城 */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-3">平台內容</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="上架中商城" value={stats.activeShops.toLocaleString('zh-TW')} />
          <StatCard label="上架中商品" value={stats.activeProducts.toLocaleString('zh-TW')} />
        </div>
      </section>
    </div>
  )
}
