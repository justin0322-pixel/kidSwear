'use client'

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useShopAnalytics } from '@/hooks/use-analytics'
import { STATUS_LABEL, type OrderStatus } from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'

// ── Colours ──────────────────────────────────────────────
const PIE_COLORS: Record<string, string> = {
  pending:    '#94a3b8',
  paid:       '#60a5fa',
  processing: '#a78bfa',
  shipped:    '#34d399',
  completed:  '#10b981',
  cancelled:  '#f87171',
  refunded:   '#fb923c',
}

const TWD = (v: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(v)

// ── KPI card ─────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600">{TWD(payload[0].value)}</p>
      {payload[1] && <p className="text-gray-500">{payload[1].value} 筆訂單</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function WholesalerAnalyticsPage() {
  const { data, isLoading, isError } = useShopAnalytics()

  const totalRevenue = data
    ? data.revenueByDay.reduce((s, d) => s + Number(d.revenue), 0)
    : 0
  const totalOrders = data
    ? data.revenueByDay.reduce((s, d) => s + d.orderCount, 0)
    : 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const pieData = data
    ? Object.entries(data.orderStatusCounts).map(([status, count]) => ({
        name: STATUS_LABEL[status as OrderStatus] ?? status,
        value: count,
        status,
      }))
    : []

  const revenueChartData = data?.revenueByDay.map((d) => ({
    date: d.date.slice(5),
    revenue: Number(d.revenue),
    orders: d.orderCount,
  })) ?? []

  const productChartData = data?.topProducts.map((p) => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
    fullName: p.name,
    revenue: Number(p.revenue),
    quantity: p.totalQuantity,
  })) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-6xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">數據分析</h1>
        <p className="text-xs text-gray-400 mt-0.5">過去 30 天</p>
      </div>

      <main className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-lg border animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">載入失敗，請重新整理頁面</p>
        )}

        {data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="30 日總營收"
                value={TWD(totalRevenue)}
                sub="不含取消 / 退款"
              />
              <KpiCard
                label="30 日訂單數"
                value={String(totalOrders)}
                sub="不含取消 / 退款"
              />
              <KpiCard
                label="平均客單價"
                value={TWD(avgOrderValue)}
              />
              <KpiCard
                label="熱銷商品"
                value={data.topProducts[0]?.name.slice(0, 12) ?? '—'}
                sub={data.topProducts[0] ? `${data.topProducts[0].totalQuantity} 件售出` : undefined}
              />
            </div>

            {/* 折線圖：每日營收趨勢 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">每日營收趨勢</h2>
              {revenueChartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">過去 30 天無有效訂單</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueChartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="revenue"
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#d1d5db' }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(v: string) => v === 'revenue' ? '營收（NT$）' : '訂單數'}
                    />
                    <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="#d1d5db"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 長條圖：熱銷商品 Top 5 */}
              <section className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">熱銷商品 Top 5</h2>
                {productChartData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-16">暫無資料</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={productChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#374151' }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        formatter={(v, _, props) => [
                          `${TWD(Number(v ?? 0))}（${(props.payload as { quantity?: number } | undefined)?.quantity ?? 0} 件）`,
                          (props.payload as { fullName?: string } | undefined)?.fullName ?? '',
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#34d399" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </section>

              {/* 圓餅圖：訂單狀態分布 */}
              <section className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">訂單狀態分布</h2>
                {pieData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-16">暫無訂單</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={PIE_COLORS[entry.status] ?? '#e5e7eb'}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${Number(v ?? 0)} 筆`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.sort((a, b) => b.value - a.value).map((entry) => {
                        const total = pieData.reduce((s, e) => s + e.value, 0)
                        return (
                          <div key={entry.status} className="flex items-center gap-2 text-xs">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: PIE_COLORS[entry.status] ?? '#e5e7eb' }}
                            />
                            <span className="text-gray-600 flex-1">{entry.name}</span>
                            <span className="font-medium text-gray-900">{entry.value}</span>
                            <span className="text-gray-400 w-8 text-right">
                              {Math.round((entry.value / total) * 100)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* 活躍零售商 Top 5 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">活躍零售商 Top 5</h2>
              {data.topRetailers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">暫無資料</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-400">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">零售商</th>
                        <th className="pb-2 font-medium text-right">訂單數</th>
                        <th className="pb-2 font-medium text-right">採購金額</th>
                        <th className="pb-2 font-medium pl-4">佔比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topRetailers.map((r, i) => {
                        const totalAmount = data.topRetailers.reduce((s, x) => s + Number(x.totalAmount), 0)
                        const pct = totalAmount > 0 ? Math.round((Number(r.totalAmount) / totalAmount) * 100) : 0
                        return (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="py-2.5 pr-3 text-gray-400">#{i + 1}</td>
                            <td className="py-2.5 pr-4 font-medium text-gray-900">{r.shopName}</td>
                            <td className="py-2.5 text-right text-gray-600">{r.orderCount}</td>
                            <td className="py-2.5 text-right text-gray-900 font-medium">
                              {TWD(Number(r.totalAmount))}
                            </td>
                            <td className="py-2.5 pl-4">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
