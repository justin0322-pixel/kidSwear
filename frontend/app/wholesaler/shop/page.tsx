'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMyShop, useUpdateMyShop } from '@/hooks/use-shop'
import { ImageUploader } from '@/components/wholesaler/ImageUploader'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, '請填寫商城名稱'),
  description: z.string().optional(),
  minOrderAmount: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, '請輸入有效金額')
    .optional(),
})

type FormValues = z.infer<typeof schema>

export default function WholesalerShopPage() {
  const { data: shop, isLoading } = useMyShop()
  const { mutate: updateShop, isPending, isSuccess, error } = useUpdateMyShop()

  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (shop) {
      reset({
        name: shop.name,
        description: shop.description ?? '',
        minOrderAmount: shop.minOrderAmount === '0.00' ? '' : shop.minOrderAmount,
      })
      setLogoUrl(shop.logoUrl ?? '')
      setBannerUrl(shop.bannerUrl ?? '')
    }
  }, [shop, reset])

  const onSubmit = (values: FormValues) => {
    updateShop({
      name: values.name,
      description: values.description || undefined,
      logoUrl: logoUrl || undefined,
      bannerUrl: bannerUrl || undefined,
      minOrderAmount: values.minOrderAmount || undefined,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">商城設定</h1>
      </div>

      <main className="p-6 max-w-xl mx-auto">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {shop && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資訊 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">基本資訊</h2>

              <div className="space-y-1">
                <Label htmlFor="name">商城名稱 *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">商城介紹</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="介紹您的商城特色、主打商品..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  {...register('description')}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="minOrderAmount">最低訂購金額（NT$）</Label>
                <Input
                  id="minOrderAmount"
                  placeholder="例：1000（不填則無限制）"
                  {...register('minOrderAmount')}
                />
                {errors.minOrderAmount && (
                  <p className="text-xs text-red-500">{errors.minOrderAmount.message}</p>
                )}
              </div>
            </section>

            {/* Logo */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">Logo</h2>
              {logoUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="logo"
                    className="h-16 w-16 rounded-lg object-cover border bg-gray-50"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-gray-400 break-all flex-1">{logoUrl}</p>
                </div>
              )}
              <ImageUploader onUploaded={(url) => setLogoUrl(url)} />
              <p className="text-xs text-gray-400">建議尺寸 200×200，圓形顯示</p>
            </section>

            {/* Banner */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">Banner</h2>
              {bannerUrl && (
                <div className="space-y-1">
                  <img
                    src={bannerUrl}
                    alt="banner"
                    className="w-full h-28 rounded-lg object-cover border bg-gray-50"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="text-xs text-gray-400 break-all">{bannerUrl}</p>
                </div>
              )}
              <ImageUploader onUploaded={(url) => setBannerUrl(url)} />
              <p className="text-xs text-gray-400">建議尺寸 1200×400，橫幅顯示於商城頂部</p>
            </section>

            <div className="pb-2 space-y-2">
              {isSuccess && (
                <p className="text-sm text-green-600 text-center">商城資訊已更新</p>
              )}
              {error && (
                <p className="text-sm text-red-500 text-center">
                  {(error as { response?: { data?: { error?: { message?: string } } } })?.response
                    ?.data?.error?.message ?? '更新失敗，請稍後再試'}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '儲存中...' : '儲存設定'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
