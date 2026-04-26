'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useOrder,
  useUpdateOrderStatus,
  useUpdateTracking,
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_ICON,
  WHOLESALER_TRANSITIONS,
  type OrderStatus,
  type StatusHistoryEntry,
} from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ROLE_LABEL: Record<string, string> = {
  wholesaler: '批發商',
  retailer: '零售商',
  admin: '管理員',
}

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="font-semibold text-gray-900 mb-4">狀態歷程</h2>
      <ol className="relative border-l border-gray-200 ml-3 space-y-6">
        {history.map((entry, i) => (
          <li key={entry.id} className="ml-6">
            <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full text-xs border-2 border-white ${
              i === history.length - 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {STATUS_ICON[entry.toStatus]}
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {STATUS_LABEL[entry.toStatus]}
                </span>
                {entry.fromStatus && (
                  <span className="text-xs text-gray-400">
                    從「{STATUS_LABEL[entry.fromStatus]}」變更
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <time className="text-xs text-gray-400">
                  {new Date(entry.createdAt).toLocaleString('zh-TW')}
                </time>
                {entry.changedByEmail && (
                  <span className="text-xs text-gray-400">
                    · {entry.changedByRole ? ROLE_LABEL[entry.changedByRole] : ''} {entry.changedByEmail}
                  </span>
                )}
              </div>
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

export default function WholesalerOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = Number(params.id)

  const { data: order, isLoading, isError } = useOrder(orderId)
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus(orderId)
  const { mutate: updateTracking, isPending: isTrackingPending } = useUpdateTracking(orderId)

  const [note, setNote] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [confirmTransition, setConfirmTransition] = useState<OrderStatus | null>(null)
  const [editingTracking, setEditingTracking] = useState(false)
  const [editTrackingValue, setEditTrackingValue] = useState('')

  const transitions = order ? (WHOLESALER_TRANSITIONS[order.status] ?? []) : []
  const needsTracking = confirmTransition
    ? (WHOLESALER_TRANSITIONS[order?.status ?? 'pending'] ?? []).find(
        (t) => t.next === confirmTransition,
      )?.requiresTracking
    : false

  const handleTransition = (next: OrderStatus) => {
    if (confirmTransition === next) {
      updateStatus(
        {
          status: next,
          note: note || undefined,
          trackingNumber: trackingNumber || undefined,
        },
        {
          onSuccess: () => {
            setConfirmTransition(null)
            setNote('')
            setTrackingNumber('')
          },
        },
      )
    } else {
      setConfirmTransition(next)
    }
  }

  const cancelConfirm = () => {
    setConfirmTransition(null)
    setNote('')
    setTrackingNumber('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/wholesaler/orders')}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          ← 返回
        </button>
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
            {/* 訂單概覽 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{order.orderNumber}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{order.retailer.shopName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">下單時間</p>
                  <p className="text-gray-900">{new Date(order.createdAt).toLocaleString('zh-TW')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">訂單總額</p>
                  <p className="text-gray-900 font-semibold">NT${Number(order.total).toLocaleString('zh-TW')}</p>
                </div>
                {order.paidAt && (
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">付款確認</p>
                    <p className="text-gray-900">{new Date(order.paidAt).toLocaleString('zh-TW')}</p>
                  </div>
                )}
                {order.shippedAt && (
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">出貨時間</p>
                    <p className="text-gray-900">{new Date(order.shippedAt).toLocaleString('zh-TW')}</p>
                  </div>
                )}
                {order.completedAt && (
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">完成時間</p>
                    <p className="text-gray-900">{new Date(order.completedAt).toLocaleString('zh-TW')}</p>
                  </div>
                )}
                {order.status === 'shipped' && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs mb-0.5">物流單號</p>
                    {editingTracking ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 text-sm font-mono"
                          placeholder="例：123456789（黑貓宅急便）"
                          value={editTrackingValue}
                          onChange={(e) => setEditTrackingValue(e.target.value)}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          disabled={isTrackingPending || !editTrackingValue.trim()}
                          onClick={() =>
                            updateTracking(editTrackingValue.trim(), {
                              onSuccess: () => setEditingTracking(false),
                            })
                          }
                        >
                          儲存
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTracking(false)}>
                          取消
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-mono font-medium">
                          {order.trackingNumber ?? <span className="text-gray-400 font-sans font-normal">尚未填寫</span>}
                        </p>
                        <button
                          type="button"
                          className="text-xs text-blue-500 hover:text-blue-700 underline"
                          onClick={() => {
                            setEditTrackingValue(order.trackingNumber ?? '')
                            setEditingTracking(true)
                          }}
                        >
                          {order.trackingNumber ? '修改' : '填寫'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {order.status !== 'shipped' && order.trackingNumber && (
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">物流單號</p>
                    <p className="text-gray-900 font-mono font-medium">{order.trackingNumber}</p>
                  </div>
                )}
              </div>

              {order.wholesalerNote && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-500 text-xs">備註：</span>
                  <p className="text-gray-800 mt-0.5">{order.wholesalerNote}</p>
                </div>
              )}
            </section>

            {/* 收件資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-3 text-sm">
              <h2 className="font-semibold text-gray-900">收件資訊</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">聯絡人</p>
                  <p className="text-gray-900">{order.contactName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">電話</p>
                  <p className="text-gray-900">{order.contactPhone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs mb-0.5">收件地址</p>
                  <p className="text-gray-900">{order.shippingAddress}</p>
                </div>
              </div>
              {order.retailerNote && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-600 mb-0.5">買家備註</p>
                  <p className="text-sm text-amber-900">{order.retailerNote}</p>
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
                      <p className="text-gray-400 text-xs mt-0.5">
                        {item.size} · {item.color} · SKU {item.sku}
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
              <div className="border-t mt-3 pt-3 flex justify-between font-semibold text-gray-900">
                <span>總計</span>
                <span>NT${Number(order.total).toLocaleString('zh-TW')}</span>
              </div>
            </section>

            {/* 狀態操作 */}
            {transitions.length > 0 && (
              <section className="bg-white rounded-lg border p-6 space-y-4">
                <h2 className="font-semibold text-gray-900">更新訂單狀態</h2>

                {confirmTransition && (
                  <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      確認將狀態更新為「<strong>{STATUS_LABEL[confirmTransition]}</strong>」？
                    </p>

                    {needsTracking && (
                      <div className="space-y-1">
                        <Label htmlFor="trackingNumber">物流單號（選填）</Label>
                        <Input
                          id="trackingNumber"
                          placeholder="例：123456789（黑貓宅急便）"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="note">備註（選填）</Label>
                      <textarea
                        id="note"
                        rows={2}
                        placeholder="填入給零售商的說明..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>
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
                      {confirmTransition === t.next
                        ? `確認：${t.label}`
                        : t.label}
                    </Button>
                  ))}
                  {confirmTransition && (
                    <Button variant="outline" onClick={cancelConfirm} disabled={isPending}>
                      取消
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* 狀態時間軸 */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <StatusTimeline history={order.statusHistory} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
