'use client'

import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, useChangePassword, useOAuthAccounts, useUnlinkOAuth, useLineNotifyStatus, useUnlinkLineNotify } from '@/hooks/use-profile'
import { useAuthStore } from '@/stores/auth-store'
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

const PROVIDER_LABEL: Record<string, string> = { line: 'LINE', google: 'Google' }

const LineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#06C755"/>
    <path d="M19.5 11.13C19.5 7.85 16.14 5.18 12 5.18S4.5 7.85 4.5 11.13c0 2.93 2.6 5.38 6.12 5.85.24.05.56.16.64.36.07.18.05.47.02.66l-.1.62c-.03.18-.14.72.63.39.77-.33 4.15-2.45 5.66-4.19 1.05-1.15 1.53-2.32 1.53-3.69z" fill="white"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

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
      <div>
        <h2 className="font-semibold text-gray-900">修改密碼</h2>
        <p className="text-xs text-gray-400 mt-0.5">適用於帳密登入的帳號</p>
      </div>
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
            {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? '修改失敗，請稍後再試'}
          </p>
        )}
        <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
          {isPending ? '更新中...' : '更新密碼'}
        </Button>
      </form>
    </section>
  )
}

export default function WholesalerProfilePage() {
  const searchParams = useSearchParams()
  const { accessToken } = useAuthStore()
  const { data: profile, isLoading } = useProfile()
  const { data: oauthAccounts, isLoading: oauthLoading } = useOAuthAccounts()
  const { mutate: unlink, isPending: unlinkPending } = useUnlinkOAuth()
  const { data: lineNotifyBound, isLoading: notifyLoading } = useLineNotifyStatus()
  const { mutate: unlinkNotify, isPending: unlinkNotifyPending } = useUnlinkLineNotify()

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '')
  const lineBindUrl = `${apiBase}/api/v1/auth/line/bind?token=${accessToken ?? ''}`
  const googleBindUrl = `${apiBase}/api/v1/auth/google/bind?token=${accessToken ?? ''}`
  const lineNotifyBindUrl = `${apiBase}/api/v1/auth/line-notify/bind?token=${accessToken ?? ''}`

  const boundParam = searchParams.get('bound')
  const errorParam = searchParams.get('error')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-xl mx-auto space-y-4">
        {/* 提示訊息 */}
        {boundParam === 'line_notify' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            已成功綁定 LINE Notify，訂單通知將推播至您的 LINE
          </div>
        )}
        {boundParam && boundParam !== 'line_notify' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            已成功綁定 {PROVIDER_LABEL[boundParam] ?? boundParam} 帳號
          </div>
        )}
        {errorParam && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {errorParam === 'oauth_already_bound' ? '此社群帳號已被其他帳號綁定' : '綁定失敗，請稍後再試'}
          </div>
        )}

        {/* 帳號資訊 */}
        <section className="bg-white rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">帳號資訊</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
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
        <ChangePasswordForm />

        {/* 社群帳號綁定（登入用） */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">社群帳號綁定</h2>
            <p className="text-xs text-gray-400 mt-0.5">綁定後可直接用社群帳號登入</p>
          </div>

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
                  <div key={provider} className="flex items-center justify-between px-4 py-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {provider === 'line' ? <LineIcon /> : <GoogleIcon />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{PROVIDER_LABEL[provider]}</p>
                        <p className="text-xs text-gray-400">
                          {account ? (account.providerName ?? account.providerEmail ?? '已綁定') : '尚未綁定'}
                        </p>
                      </div>
                    </div>
                    {account ? (
                      <Button type="button" variant="outline" size="sm" disabled={unlinkPending} onClick={() => unlink(provider)}>
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

        {/* LINE Notify 推播綁定 */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">LINE Notify 訂單推播</h2>
            <p className="text-xs text-gray-400 mt-0.5">綁定後，新訂單與庫存預警將推播到您的 LINE</p>
          </div>

          {notifyLoading ? (
            <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center justify-between px-4 py-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <LineIcon />
                <div>
                  <p className="text-sm font-medium text-gray-900">LINE Notify</p>
                  <p className="text-xs text-gray-400">{lineNotifyBound ? '已綁定，推播已啟用' : '尚未綁定'}</p>
                </div>
              </div>
              {lineNotifyBound ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unlinkNotifyPending}
                  onClick={() => unlinkNotify()}
                >
                  解除綁定
                </Button>
              ) : (
                <a
                  href={lineNotifyBindUrl}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  綁定
                </a>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
