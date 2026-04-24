'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCart, useClearCart, type CartItem } from '@/hooks/use-cart'
import { useProfile } from '@/hooks/use-profile'
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

type ShopGroup = {
  shopId: string
  shopName: string
  items: CartItem[]
  subtotal: number
}

function groupByShop(items: CartItem[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>()
  for (const item of items) {
    const group = map.get(item.shopId) ?? {
      shopId: item.shopId,
      shopName: item.shopName,
      items: [],
      subtotal: 0,
    }
    group.items.push(item)
    group.subtotal += Number(item.subtotal)
    map.set(item.shopId, group)
  }
  return Array.from(map.values())
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: cart, isLoading: cartLoading } = useCart()
  const { mutate: clearCart } = useClearCart()
  const { data: profile } = useProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!profile) return
    reset({
      contactName: profile.profile?.contactPerson ?? '',
      contactPhone: profile.phone ?? '',
      shippingAddress: profile.profile?.shippingAddress ?? '',
      retailerNote: '',
    })
  }, [profile, reset])

  const { mutate: createOrder, isPending, error } = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!cart || cart.items.length === 0) throw new Error('購物車是空的')

      const groups = groupByShop(cart.items)
      const orders: OrderDetail[] = []

      for (const group of groups) {
        const res = await api.post<{ data: OrderDetail }>('/orders', {
          shopId: Number(group.shopId),
          items: group.items.map((item) => ({
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
      clearCart()
      const [first, ...rest] = orders
      const alsoParam = rest.length > 0 ? `?also=${rest.map((o) => o.id).join(',')}` : ''
      router.push(`/retailer/orders/${first.id}/success${alsoParam}`)
    },
  })

  const onSubmit = (values: FormValues) => createOrder(values)

  const groups = cart ? groupByShop(cart.items) : []
  const totalQuantity = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  const isMultiShop = groups.length > 1

  if (!cartLoading && cart && cart.items.length === 0) {
    router.replace('/retailer/cart')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b px-6 py-3 max-w-xl mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/retailer/cart')}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          ← 返回
        </button>
        <h1 className="text-lg font-bold text-gray-900">結帳</h1>
      </div>

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

            {/* 訂單摘要（依商城分組） */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">訂單摘要</h2>

              {groups.map((group, i) => (
                <div key={group.shopId}>
                  {isMultiShop && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        訂單 {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{group.shopName}</span>
                    </div>
                  )}
                  <div className="divide-y">
                    {group.items.map((item) => (
                      <div key={item.variantId} className="py-2 flex justify-between gap-2 text-sm">
                        <span className="text-gray-700 min-w-0">
                          <span className="truncate block">{item.productName}</span>
                          <span className="text-gray-400 text-xs">
                            {item.size} · {item.color} × {item.quantity}
                          </span>
                        </span>
                        <span className="text-gray-900 shrink-0 tabular-nums">
                          NT${Number(item.subtotal).toLocaleString('zh-TW')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isMultiShop && (
                    <div className="flex justify-between text-sm text-gray-500 pt-2 border-t mt-1">
                      <span>小計</span>
                      <span className="tabular-nums">
                        NT${group.subtotal.toLocaleString('zh-TW')}
                      </span>
                    </div>
                  )}
                  {isMultiShop && i < groups.length - 1 && (
                    <div className="border-b border-dashed mt-4" />
                  )}
                </div>
              ))}

              <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                <span>總計（{totalQuantity} 件）</span>
                <span className="tabular-nums">
                  NT${Number(cart.total).toLocaleString('zh-TW')}
                </span>
              </div>
            </section>

            {/* 付款說明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
              <p className="font-medium">付款方式：銀行匯款</p>
              <p className="text-amber-700">
                送出後請於 3 個工作日內完成匯款，批發商確認收款後開始備貨。
              </p>
              {isMultiShop && (
                <p className="text-amber-700">
                  本次將建立 <strong>{groups.length} 筆</strong> 訂單（每家商城各一筆）。
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">
                {(error as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ?? '送出失敗，請稍後再試'}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending
                ? '建立訂單中...'
                : isMultiShop
                  ? `送出 ${groups.length} 筆訂單`
                  : '送出訂單'}
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
