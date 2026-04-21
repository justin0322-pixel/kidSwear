'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  shopName: z.string().min(1, '請填寫店名').max(100),
  contactPerson: z.string().min(1, '請填寫聯絡人').max(50),
  shippingAddress: z.string().min(5, '請填寫完整地址'),
})

type FormValues = z.infer<typeof schema>

export default function RetailerOnboardingPage() {
  const router = useRouter()
  const { mutate: updateProfile, isPending, error } = useUpdateProfile()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    updateProfile(values, {
      onSuccess: () => router.replace('/retailer/home'),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">歡迎加入！</h1>
          <p className="text-sm text-gray-500">請補充以下資料以完成設定</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="shopName">店名 *</Label>
            <Input id="shopName" placeholder="例：小熊寶貝童裝" {...register('shopName')} />
            {errors.shopName && (
              <p className="text-xs text-red-500">{errors.shopName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactPerson">聯絡人 *</Label>
            <Input id="contactPerson" placeholder="您的姓名" {...register('contactPerson')} />
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

          {error && (
            <p className="text-sm text-red-500 text-center">
              {(error as { response?: { data?: { error?: { message?: string } } } })
                ?.response?.data?.error?.message ?? '儲存失敗，請稍後再試'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '儲存中...' : '完成設定，開始採購'}
          </Button>
        </form>
      </div>
    </div>
  )
}
