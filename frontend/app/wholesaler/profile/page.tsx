'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, useChangePassword } from '@/hooks/use-profile'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const pwSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '新密碼至少 8 個字元'),
  confirmPassword: z.string().min(1, '請確認新密碼'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '兩次密碼不一致',
  path: ['confirmPassword'],
})

type PwFormValues = z.infer<typeof pwSchema>

export default function WholesalerProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const { mutate: changePassword, isPending, isSuccess, error, reset: resetMutation } = useChangePassword()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwFormValues>({
    resolver: zodResolver(pwSchema),
  })

  const onSubmit = (values: PwFormValues) => {
    changePassword(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          reset()
          setTimeout(() => resetMutation(), 3000)
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {/* 帳號資訊 */}
        <section className="bg-white rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">帳號資訊</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">電子郵件</span>
                <span className="text-gray-900">{profile?.email ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">公司名稱</span>
                <span className="text-gray-900">{profile?.profile?.companyName ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">聯絡人</span>
                <span className="text-gray-900">{profile?.profile?.contactPerson ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">角色</span>
                <span className="text-gray-900">批發商</span>
              </div>
            </div>
          )}
        </section>

        {/* 修改密碼 */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">修改密碼</h2>
            <p className="text-xs text-gray-400 mt-0.5">適用於帳密登入的帳號</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">目前密碼</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">新密碼</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {isSuccess && <p className="text-sm text-green-600">密碼已更新</p>}
            {error && (
              <p className="text-sm text-red-500">
                {(error as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ?? '修改失敗，請稍後再試'}
              </p>
            )}

            <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
              {isPending ? '更新中...' : '更新密碼'}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
