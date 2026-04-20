'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  shopName: z.string().min(1, '請填寫店名').max(100),
  contactPerson: z.string().min(1, '請填寫聯絡人').max(50),
  shippingAddress: z.string().min(5, '請填寫完整地址'),
})

type FormValues = z.infer<typeof schema>

export default function RetailerProfilePage() {
  const router = useRouter()
  const { data: profile, isLoading } = useProfile()
  const { mutate: updateProfile, isPending, isSuccess, error } = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile?.profile) {
      reset({
        shopName: profile.profile.shopName ?? '',
        contactPerson: profile.profile.contactPerson ?? '',
        shippingAddress: profile.profile.shippingAddress ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = (values: FormValues) => updateProfile(values)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {/* 帳號資訊（唯讀） */}
        <section className="bg-white rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">帳號資訊</h2>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">電子郵件</span>
              <span className="text-gray-900">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">角色</span>
              <span className="text-gray-900">零售商</span>
            </div>
          </div>
        </section>

        {/* 可編輯資料 */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {profile && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">店家資訊</h2>

              <div className="space-y-1">
                <Label htmlFor="shopName">店名 *</Label>
                <Input id="shopName" {...register('shopName')} />
                {errors.shopName && (
                  <p className="text-xs text-red-500">{errors.shopName.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="contactPerson">聯絡人 *</Label>
                <Input id="contactPerson" {...register('contactPerson')} />
                {errors.contactPerson && (
                  <p className="text-xs text-red-500">{errors.contactPerson.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="shippingAddress">預設收件地址 *</Label>
                <Input
                  id="shippingAddress"
                  placeholder="台北市信義區信義路五段7號"
                  {...register('shippingAddress')}
                />
                <p className="text-xs text-gray-400">結帳時將自動帶入此地址</p>
                {errors.shippingAddress && (
                  <p className="text-xs text-red-500">{errors.shippingAddress.message}</p>
                )}
              </div>
            </section>

            {isSuccess && (
              <p className="text-sm text-green-600 text-center">資料已更新</p>
            )}
            {error && (
              <p className="text-sm text-red-500 text-center">
                {(error as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ?? '更新失敗，請稍後再試'}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !isDirty}
            >
              {isPending ? '儲存中...' : '儲存資料'}
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
