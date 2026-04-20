'use client'

import { useShopAnalytics } from '@/hooks/use-analytics'
import { STATUS_LABEL, STATUS_COLOR, type OrderStatus } from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'

function Bar({ value, max, color = 'bg-blue-400' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function WholesalerAnalyticsPage() {
  const { data, isLoading, isError } = useShopAnalytics()

  const maxRevenue = data
    ? Math.max(...data.revenueByDay.map((d) => Number(d.revenue)), 1)
    : 1
  const maxProductRevenue = data
    ? Math.max(...data.topProducts.map((p) => Number(p.revenue)), 1)
    : 1
  const maxRetailerAmount = data
    ? Math.max(...data.topRetailers.map((r) => Number(r.totalAmount)), 1)
    : 1
  const totalOrders = data
    ? Object.values(data.orderStatusCounts).reduce((s, n) => s + n, 0)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-5xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">數據分析</h1>
        <p className="text-xs text-gray-400 mt-0.5">過去 30 天</p>
      </div>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-white rounded-lg border animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">載入失敗，請重新整理頁面</p>
        )}

        {data && (
          <>
            {/* 營收趨勢 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">每日營收趨勢</h2>
              {data.revenueByDay.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">過去 30 天無有效訂單</p>
              ) : (
                <div className="space-y-2">
                  {data.revenueByDay.map((day) => (
                    <div key={day.date} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 w-24 shrink-0">{day.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded flex items-center px-2"
                          style={{ width: `${Math.max(4, Math.round((Number(day.revenue) / maxRevenue) * 100))}%` }}
                        >
                          {Number(day.revenue) / maxRevenue > 0.25 && (
                            <span className="text-white text-xs">
                              NT${Number(day.revenue).toLocaleString('zh-TW')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs w-16 text-right shrink-0">
                        {day.orderCount} 筆
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 熱銷商品 */}
              <section className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">熱銷商品 Top 5</h2>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">暫無資料</p>
                ) : (
                  <div className="space-y-4">
                    {data.topProducts.map((product, i) => (
                      <div key={product.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-400 text-xs w-4 shrink-0">#{i + 1}</span>
                            <span className="text-gray-900 truncate">{product.name}</span>
                          </span>
                          <span className="text-gray-500 text-xs shrink-0 ml-2">
                            {product.orderCount} 筆 · {product.totalQuantity} 件
                          </span>
                        </div>
                        <Bar value={Number(product.revenue)} max={maxProductRevenue} color="bg-green-400" />
                        <p className="text-xs text-gray-400 text-right">
                          NT${Number(product.revenue).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 活躍零售商 */}
              <section className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">活躍零售商 Top 5</h2>
                {data.topRetailers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">暫無資料</p>
                ) : (
                  <div className="space-y-4">
                    {data.topRetailers.map((retailer, i) => (
                      <div key={retailer.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-400 text-xs w-4 shrink-0">#{i + 1}</span>
                            <span className="text-gray-900 truncate">{retailer.shopName}</span>
                          </span>
                          <span className="text-gray-500 text-xs shrink-0 ml-2">
                            {retailer.orderCount} 筆訂單
                          </span>
                        </div>
                        <Bar value={Number(retailer.totalAmount)} max={maxRetailerAmount} color="bg-purple-400" />
                        <p className="text-xs text-gray-400 text-right">
                          NT${Number(retailer.totalAmount).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* 訂單狀態分布 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">訂單狀態分布</h2>
              {totalOrders === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">暫無訂單</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(Object.entries(data.orderStatusCounts) as [OrderStatus, number][])
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <div key={status} className="text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          {STATUS_LABEL[status] ?? status}
                        </span>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                        <p className="text-xs text-gray-400">
                          {Math.round((count / totalOrders) * 100)}%
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
