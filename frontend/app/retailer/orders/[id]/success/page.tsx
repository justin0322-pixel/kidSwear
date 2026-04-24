'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrder } from '@/hooks/use-orders'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: order, isLoading } = useOrder(Number(id))

  const alsoIds = searchParams.get('also')?.split(',').filter(Boolean) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-lg mx-auto p-6 space-y-4 pt-10">
        {/* 成功圖示 */}
        <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">訂單已送出！</h1>
          <p className="text-gray-500 text-sm">感謝您的訂購，批發商收到通知後將盡快確認。</p>
        </div>

        {/* 訂單摘要 */}
        {isLoading && <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />}
        {order && (
          <div className="bg-white rounded-xl border p-6 space-y-1">
            <h2 className="font-semibold text-gray-900 mb-3">訂單資訊</h2>
            <div className="divide-y text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">訂單編號</span>
                <span className="font-mono font-medium text-gray-900">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">商城</span>
                <span className="text-gray-900">{order.shop.name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">商品件數</span>
                <span className="text-gray-900">{order.itemCount} 件</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">訂單金額</span>
                <span className="font-bold text-gray-900">
                  NT${Number(order.total).toLocaleString('zh-TW')}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">收件地址</span>
                <span className="text-gray-900 text-right max-w-[60%]">{order.shippingAddress}</span>
              </div>
            </div>
          </div>
        )}

        {/* 付款說明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
          <p className="font-medium">請於 3 個工作日內完成匯款</p>
          <p className="text-amber-700">批發商確認收款後將開始備貨並更新訂單狀態。</p>
        </div>

        {/* 多筆訂單提示 */}
        {alsoIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">另有 {alsoIds.length} 筆訂單同步建立</p>
            <Link href="/retailer/orders" className="text-blue-600 underline text-xs">
              查看全部訂單 →
            </Link>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="space-y-2 pt-2">
          <Button className="w-full" size="lg" onClick={() => router.push(`/retailer/orders/${id}`)}>
            查看訂單詳情
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={() => router.push('/retailer/home')}>
            繼續購物
          </Button>
        </div>
      </main>
    </div>
  )
}
