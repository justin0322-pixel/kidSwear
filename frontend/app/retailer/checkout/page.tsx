'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCart } from '@/hooks/use-cart'
import { Navbar } from '@/components/layout/Navbar'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { OrderDetail } from '@/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  contactName: z.string().min(1, '請填寫聯絡人姓名'),
  contactPhone: z.string().min(8, '請填寫有效電話號碼'),
  shippingAddress: z.string().min(5, '請填寫完整收件地址'),
  retailerNote: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CheckoutPage() {
  const router = useRouter()
  const { data: cart, isLoading: cartLoading } = useCart()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { mutate: createOrder, isPending, error } = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!cart || cart.items.length === 0) throw new Error('購物車是空的')

      // 依 shopId 分組，每個商城建一筆訂單
      const byShop = new Map<string, typeof cart.items>()
      for (const item of cart.items) {
        const list = byShop.get(item.shopId) ?? []
        list.push(item)
        byShop.set(item.shopId, list)
      }

      const orders: OrderDetail[] = []
      for (const shopId of Array.from(byShop.keys())) {
        const items = byShop.get(shopId)!
        const res = await api.post<{ data: OrderDetail }>('/orders', {
          shopId: Number(shopId),
          items: items.map((item) => ({
            variantId: Number(item.variantId),
            quantity: item.quantity,
          })),
          shippingAddress: values.shippingAddress,
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          retailerNote: values.retailerNote || undefined,
        })
        orders.push(res.data.data)
      }
      return orders
    },
    onSuccess: (orders) => {
      // 跳到第一筆訂單詳情
      router.push(`/retailer/orders/${orders[0].id}`)
    },
  })

  const onSubmit = (values: FormValues) => createOrder(values)

  const total = cart?.total ?? '0'
  const itemCount = cart?.items.length ?? 0

  // 購物車已清空就不讓結帳
  if (!cartLoading && cart && cart.items.length === 0) {
    router.replace('/retailer/cart')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {cartLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {cart && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 收件資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">收件資訊</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="contactName">聯絡人姓名 *</Label>
                  <Input id="contactName" placeholder="王小明" {...register('contactName')} />
                  {errors.contactName && (
                    <p className="text-xs text-red-500">{errors.contactName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactPhone">聯絡電話 *</Label>
                  <Input id="contactPhone" placeholder="0912345678" {...register('contactPhone')} />
                  {errors.contactPhone && (
                    <p className="text-xs text-red-500">{errors.contactPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="shippingAddress">收件地址 *</Label>
                <Input
                  id="shippingAddress"
                  placeholder="台北市信義區信義路五段7號"
                  {...register('shippingAddress')}
                />
                {errors.shippingAddress && (
                  <p className="text-xs text-red-500">{errors.shippingAddress.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="retailerNote">備註（選填）</Label>
                <textarea
                  id="retailerNote"
                  rows={2}
                  placeholder="例：希望週五前出貨"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  {...register('retailerNote')}
                />
              </div>
            </section>

            {/* 訂單摘要 */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">訂單摘要</h2>
              <div className="divide-y">
                {cart.items.map((item) => (
                  <div key={item.variantId} className="py-2 flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.productName}
                      <span className="text-gray-400 ml-1">
                        {item.size} · {item.color} × {item.quantity}
                      </span>
                    </span>
                    <span className="text-gray-900">
                      NT${Number(item.subtotal).toLocaleString('zh-TW')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                <span>總計（{itemCount} 件）</span>
                <span>NT${Number(total).toLocaleString('zh-TW')}</span>
              </div>
            </section>

            {/* 付款說明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium">付款方式：銀行匯款</p>
              <p className="mt-1 text-amber-700">
                送出訂單後，請於 3 個工作日內完成匯款，批發商確認收款後才會開始備貨。
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">
                {(error as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ?? '送出失敗，請稍後再試'}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending ? '送出中...' : '送出訂單'}
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
