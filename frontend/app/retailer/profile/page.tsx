'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, useUpdateProfile, useOAuthAccounts, useUnlinkOAuth, useChangePassword } from '@/hooks/use-profile'
import { useAuthStore } from '@/stores/auth-store'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  shopName: z.string().min(1, '請填寫店名').max(100),
  contactPerson: z.string().min(1, '請填寫聯絡人').max(50),
  shippingAddress: z.string().min(5, '請填寫完整地址'),
  phone: z
    .string()
    .regex(/^(?:0\d{8,9}|\+886\d{9}|886\d{9})$/, '請輸入有效的台灣電話號碼')
    .optional()
    .or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

const pwSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '新密碼至少 8 個字元'),
  confirmPassword: z.string().min(1, '請確認新密碼'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '兩次密碼不一致',
  path: ['confirmPassword'],
})

type PwFormValues = z.infer<typeof pwSchema>

function ChangePasswordForm() {
  const { mutate: changePassword, isPending, isSuccess, error, reset: resetMutation } = useChangePassword()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwFormValues>({ resolver: zodResolver(pwSchema) })

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
    <section className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">修改密碼</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="currentPassword">目前密碼</Label>
          <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
          {errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="newPassword">新密碼</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
          {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">確認新密碼</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
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
  )
}

const PROVIDER_LABEL: Record<string, string> = { line: 'LINE', google: 'Google' }

const LineIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#06C755]">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
)

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function RetailerProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuthStore()
  const { data: profile, isLoading } = useProfile()
  const { mutate: updateProfile, isPending, isSuccess, error } = useUpdateProfile()
  const { data: oauthAccounts, isLoading: oauthLoading } = useOAuthAccounts()
  const { mutate: unlink, isPending: unlinkPending } = useUnlinkOAuth()

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const lineBindUrl = `${apiBase}/api/v1/auth/line/bind?token=${accessToken ?? ''}`
  const googleBindUrl = `${apiBase}/api/v1/auth/google/bind?token=${accessToken ?? ''}`

  const boundProvider = searchParams.get('bound')
  const bindError = searchParams.get('error')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile) {
      reset({
        shopName: profile.profile?.shopName ?? '',
        contactPerson: profile.profile?.contactPerson ?? '',
        shippingAddress: profile.profile?.shippingAddress ?? '',
        phone: profile.phone ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = (values: FormValues) =>
    updateProfile({ ...values, phone: values.phone || undefined })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {/* 綁定成功/失敗提示 */}
        {boundProvider && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            已成功綁定 {PROVIDER_LABEL[boundProvider] ?? boundProvider} 帳號
          </div>
        )}
        {bindError === 'bind_failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            綁定失敗，請稍後再試
          </div>
        )}
        {bindError === 'oauth_already_bound' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            此社群帳號已被其他帳號綁定
          </div>
        )}

        {/* 帳號資訊（唯讀） */}
        <section className="bg-white rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">帳號資訊</h2>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">電子郵件</span>
              <span className="text-gray-900">{profile?.email ?? '-'}</span>
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
            {[...Array(4)].map((_, i) => (
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
                <Label htmlFor="phone">聯絡電話</Label>
                <Input id="phone" placeholder="0912345678" {...register('phone')} />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
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

            <Button type="submit" className="w-full" disabled={isPending || !isDirty}>
              {isPending ? '儲存中...' : '儲存資料'}
            </Button>
          </form>
        )}

        {/* 修改密碼 */}
        <ChangePasswordForm />

        {/* 社群帳號綁定 */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">社群帳號綁定</h2>
          <p className="text-xs text-gray-400">綁定後可直接用社群帳號登入</p>

          {oauthLoading && (
            <div className="space-y-2">
              <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          )}

          {oauthAccounts && (
            <div className="space-y-2">
              {(['line', 'google'] as const).map((provider) => {
                const account = oauthAccounts.find((a) => a.provider === provider)
                const bindUrl = provider === 'line' ? lineBindUrl : googleBindUrl
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between px-4 py-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {provider === 'line' ? <LineIcon /> : <GoogleIcon />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {PROVIDER_LABEL[provider]}
                        </p>
                        <p className="text-xs text-gray-400">
                          {account
                            ? (account.providerName ?? account.providerEmail ?? '已綁定')
                            : '尚未綁定'}
                        </p>
                      </div>
                    </div>
                    {account ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={unlinkPending}
                        onClick={() => unlink(provider)}
                      >
                        解除綁定
                      </Button>
                    ) : (
                      <a
                        href={bindUrl}
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        綁定
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
