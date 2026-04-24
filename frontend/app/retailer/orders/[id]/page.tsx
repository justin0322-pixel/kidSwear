'use client'

import { useRouter, useParams } from 'next/navigation'
import { useOrder, STATUS_LABEL, STATUS_COLOR, STATUS_ICON } from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import type { StatusHistoryEntry } from '@/hooks/use-orders'

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'completed'] as const

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="font-semibold text-gray-900 mb-4">訂單動態</h2>
      <ol className="relative border-l border-gray-200 ml-3 space-y-5">
        {history.map((entry, i) => (
          <li key={entry.id} className="ml-6">
            <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full text-xs border-2 border-white ${
              i === history.length - 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {STATUS_ICON[entry.toStatus]}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{STATUS_LABEL[entry.toStatus]}</p>
              <time className="text-xs text-gray-400">
                {new Date(entry.createdAt).toLocaleString('zh-TW')}
              </time>
              {entry.note && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-1 max-w-sm">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function RetailerOrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const orderId = Number(id)

  const { data: order, isLoading, isError } = useOrder(orderId)
  const queryClient = useQueryClient()

  const { mutate: cancelOrder, isPending: cancelling } = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${orderId}/cancel`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const currentStepIndex = order
    ? STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number])
    : -1

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">載入失敗，請重新整理頁面</p>
        )}

        {order && (
          <>
            {/* 狀態進度條 */}
            {order.status !== 'cancelled' && order.status !== 'refunded' && (
              <section className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 -z-0" />
                  <div
                    className="absolute left-0 top-4 h-0.5 bg-gray-900 -z-0 transition-all"
                    style={{
                      width:
                        currentStepIndex < 0
                          ? '0%'
                          : `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                    }}
                  />
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-1 z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                          i <= currentStepIndex
                            ? 'bg-gray-900 border-gray-900 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {i < currentStepIndex ? '✓' : i + 1}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {STATUS_LABEL[step]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 訂單資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{order.orderNumber}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500">商城</p>
                  <p className="text-gray-900 font-medium">{order.shop.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">訂單總額</p>
                  <p className="text-gray-900 font-medium">
                    NT${Number(order.total).toLocaleString('zh-TW')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">下單時間</p>
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>
                {order.shippedAt && (
                  <div>
                    <p className="text-gray-500">出貨時間</p>
                    <p className="text-gray-900">
                      {new Date(order.shippedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                )}
              </div>

              {order.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  請於 3 個工作日內完成銀行匯款，批發商確認後才會開始備貨。
                </div>
              )}

              {order.wholesalerNote && (
                <div className="text-sm">
                  <p className="text-gray-500">批發商備註</p>
                  <p className="text-gray-900 mt-0.5">{order.wholesalerNote}</p>
                </div>
              )}
            </section>

            {/* 收件資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-2 text-sm">
              <h2 className="font-semibold text-gray-900 mb-3">收件資訊</h2>
              <div>
                <p className="text-gray-500">聯絡人</p>
                <p className="text-gray-900">{order.contactName}・{order.contactPhone}</p>
              </div>
              <div>
                <p className="text-gray-500">收件地址</p>
                <p className="text-gray-900">{order.shippingAddress}</p>
              </div>
              {order.retailerNote && (
                <div>
                  <p className="text-gray-500">備註</p>
                  <p className="text-gray-900">{order.retailerNote}</p>
                </div>
              )}
            </section>

            {/* 商品明細 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">商品明細</h2>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {item.size} · {item.color}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-900">
                        NT${Number(item.unitPrice).toLocaleString('zh-TW')} × {item.quantity}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        NT${Number(item.subtotal).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 flex justify-between font-bold text-gray-900">
                <span>總計</span>
                <span>NT${Number(order.total).toLocaleString('zh-TW')}</span>
              </div>
            </section>

            {/* 取消訂單 */}
            {order.status === 'pending' && (
              <div>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400"
                  disabled={cancelling}
                  onClick={() => {
                    if (confirm('確定要取消這筆訂單嗎？')) cancelOrder()
                  }}
                >
                  {cancelling ? '取消中...' : '取消訂單'}
                </Button>
              </div>
            )}

            {/* 物流單號 */}
            {order.trackingNumber && (
              <section className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500 mb-1">物流單號</p>
                <p className="font-mono font-medium text-gray-900 text-sm">{order.trackingNumber}</p>
              </section>
            )}

            {/* 狀態時間軸 */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <StatusTimeline history={order.statusHistory} />
            )}

            <div className="pb-4" />
          </>
        )}
      </main>
    </div>
  )
}
