'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  useOrder,
  useUpdateOrderStatus,
  STATUS_LABEL,
  STATUS_COLOR,
  WHOLESALER_TRANSITIONS,
  type OrderStatus,
} from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function WholesalerOrderDetailPage() {
  const params = useParams()
  const orderId = Number(params.id)

  const { data: order, isLoading, isError } = useOrder(orderId)
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus(orderId)

  const [note, setNote] = useState('')
  const [confirmTransition, setConfirmTransition] = useState<OrderStatus | null>(null)

  const transitions = order ? WHOLESALER_TRANSITIONS[order.status] ?? [] : []

  const handleTransition = (next: OrderStatus) => {
    if (confirmTransition === next) {
      updateStatus(
        { status: next, note: note || undefined },
        {
          onSuccess: () => {
            setConfirmTransition(null)
            setNote('')
          },
        },
      )
    } else {
      setConfirmTransition(next)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">訂單詳情</h1>
      </div>

      <main className="p-6 max-w-2xl mx-auto space-y-4">
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
            {/* 訂單基本資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{order.orderNumber}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-500">零售商</span>
                  <p className="text-gray-900 font-medium">{order.retailer.shopName}</p>
                </div>
                <div>
                  <span className="text-gray-500">訂單總額</span>
                  <p className="text-gray-900 font-medium">
                    NT${Number(order.total).toLocaleString('zh-TW')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">下單時間</span>
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>
                {order.paidAt && (
                  <div>
                    <span className="text-gray-500">付款時間</span>
                    <p className="text-gray-900">
                      {new Date(order.paidAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                )}
                {order.shippedAt && (
                  <div>
                    <span className="text-gray-500">出貨時間</span>
                    <p className="text-gray-900">
                      {new Date(order.shippedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* 收件資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-2 text-sm">
              <h2 className="font-semibold text-gray-900 mb-3">收件資訊</h2>
              <div>
                <span className="text-gray-500">聯絡人</span>
                <p className="text-gray-900">{order.contactName}・{order.contactPhone}</p>
              </div>
              <div>
                <span className="text-gray-500">收件地址</span>
                <p className="text-gray-900">{order.shippingAddress}</p>
              </div>
              {order.retailerNote && (
                <div>
                  <span className="text-gray-500">買家備註</span>
                  <p className="text-gray-900">{order.retailerNote}</p>
                </div>
              )}
            </section>

            {/* 商品明細 */}
            <section className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">商品明細</h2>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {item.size} · {item.color} · SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-900">
                        NT${Number(item.unitPrice).toLocaleString('zh-TW')} × {item.quantity}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        小計 NT${Number(item.subtotal).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                <span>總計</span>
                <span>NT${Number(order.total).toLocaleString('zh-TW')}</span>
              </div>
            </section>

            {/* 狀態操作 */}
            {transitions.length > 0 && (
              <section className="bg-white rounded-lg border p-6 space-y-4">
                <h2 className="font-semibold text-gray-900">更新狀態</h2>

                {confirmTransition && (
                  <div className="space-y-2">
                    <Label htmlFor="note">備註（選填）</Label>
                    <textarea
                      id="note"
                      rows={2}
                      placeholder="例：黑貓宅急便，單號 123456789"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => (
                    <Button
                      key={t.next}
                      disabled={isPending}
                      onClick={() => handleTransition(t.next)}
                      variant={confirmTransition === t.next ? 'default' : 'outline'}
                    >
                      {confirmTransition === t.next ? `確認：${t.label}` : t.label}
                    </Button>
                  ))}
                  {confirmTransition && (
                    <Button
                      variant="outline"
                      onClick={() => { setConfirmTransition(null); setNote('') }}
                    >
                      取消
                    </Button>
                  )}
                </div>

                {order.wholesalerNote && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">上次備註：</span>
                    {order.wholesalerNote}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
