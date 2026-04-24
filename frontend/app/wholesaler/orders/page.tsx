'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useOrders,
  useUpdateOrderStatus,
  STATUS_LABEL,
  STATUS_COLOR,
  type OrderStatus,
  type Order,
} from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'processing', label: '備貨中' },
  { value: 'shipped', label: '已出貨' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

// 列表頁只顯示最重要的單步快速操作
const QUICK_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  pending: { label: '確認收款', next: 'paid' },
  paid: { label: '開始備貨', next: 'processing' },
}

function QuickActionButton({ order }: { order: Order }) {
  const action = QUICK_ACTION[order.status]
  const { mutate, isPending } = useUpdateOrderStatus(Number(order.id))
  if (!action) return null

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation()
        mutate({ status: action.next })
      }}
      className="text-xs whitespace-nowrap"
    >
      {isPending ? '更新中...' : action.label}
    </Button>
  )
}

export default function WholesalerOrdersPage() {
  const router = useRouter()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useOrders({ page, status })

  const handleTabChange = (val: string) => {
    setStatus(val)
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-5xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">訂單管理</h1>
      </div>

      <main className="p-6 max-w-5xl mx-auto space-y-4">
        {/* 狀態篩選 */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                status === tab.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border">
          {isLoading && (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-center text-red-500 py-12">載入失敗，請重新整理頁面</p>
          )}

          {data && data.items.length === 0 && (
            <p className="text-center text-gray-400 py-16">
              {status ? `目前沒有「${STATUS_LABEL[status as OrderStatus]}」的訂單` : '目前沒有訂單'}
            </p>
          )}

          {data && data.items.length > 0 && (
            <div className="divide-y">
              {data.items.map((order) => (
                <div
                  key={order.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/wholesaler/orders/${order.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.retailer.shopName} · {order.itemCount} 件商品
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          NT${Number(order.total).toLocaleString('zh-TW')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">查看詳情 →</p>
                      </div>
                      <QuickActionButton order={order} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一頁
            </Button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一頁
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
