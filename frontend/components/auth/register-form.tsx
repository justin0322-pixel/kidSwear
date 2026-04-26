'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  role: z.enum(['retailer', 'wholesaler']),
  email: z.string().email('請輸入有效的 Email'),
  password: z
    .string()
    .min(8, '密碼至少 8 個字元')
    .regex(/[A-Z]/, '需包含大寫字母')
    .regex(/[a-z]/, '需包含小寫字母')
    .regex(/[0-9]/, '需包含數字'),
  contactPerson: z.string().min(1, '請輸入聯絡人姓名').max(50),
  companyName: z.string().optional(),
  shopName: z.string().optional(),
  shippingAddress: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'wholesaler' && !data.companyName) {
    ctx.addIssue({ code: 'custom', path: ['companyName'], message: '批發商必須填寫公司名稱' })
  }
  if (data.role === 'retailer' && !data.shopName) {
    ctx.addIssue({ code: 'custom', path: ['shopName'], message: '零售商必須填寫店家名稱' })
  }
  if (data.role === 'retailer' && !data.shippingAddress) {
    ctx.addIssue({ code: 'custom', path: ['shippingAddress'], message: '零售商必須填寫收件地址' })
  }
})

type FormValues = z.infer<typeof schema>

const ROLE_LABELS = { retailer: '零售商（我要進貨）', wholesaler: '批發商（我要賣貨）' }

export function RegisterForm() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '')
  const lineLoginUrl = `${apiBase}/api/v1/auth/line`
  const googleLoginUrl = `${apiBase}/api/v1/auth/google`

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'retailer' },
  })

  const role = watch('role')

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      const { data } = await api.post<{
        data: { user: { id: string; email: string; role: 'wholesaler' | 'retailer' | 'admin' }; accessToken: string }
      }>('/auth/register', values)
      setAuth(data.data.user, data.data.accessToken)
      router.push(data.data.user.role === 'wholesaler' ? '/wholesaler/dashboard' : '/retailer/home')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '註冊失敗，請稍後再試'
      setError(msg)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">建立帳號</CardTitle>
        <CardDescription className="text-center">選擇您的角色並填寫資料</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 角色選擇 */}
          <div className="grid grid-cols-2 gap-3">
            {(['retailer', 'wholesaler'] as const).map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center justify-center rounded-md border-2 p-3 text-sm font-medium transition-colors ${
                  role === r ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:border-primary/50'
                }`}
              >
                <input type="radio" value={r} {...register('role')} className="sr-only" />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="your@email.com" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" placeholder="至少 8 碼，含大小寫與數字" {...register('password')} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">聯絡人姓名</Label>
            <Input id="contactPerson" placeholder="王小明" {...register('contactPerson')} />
            {errors.contactPerson && <p className="text-sm text-red-500">{errors.contactPerson.message}</p>}
          </div>

          {role === 'wholesaler' && (
            <div className="space-y-2">
              <Label htmlFor="companyName">公司名稱</Label>
              <Input id="companyName" placeholder="可愛童裝有限公司" {...register('companyName')} />
              {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
            </div>
          )}

          {/* 零售商社群快速登入 */}
          {role === 'retailer' && (
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">零售商可直接用社群帳號快速加入</span>
                </div>
              </div>
              <a
                href={lineLoginUrl}
                className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-200 bg-[#06C755] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#05b34c] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                用 LINE 快速加入
              </a>
              <a
                href={googleLoginUrl}
                className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                用 Google 快速加入
              </a>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">或填寫資料註冊</span>
                </div>
              </div>
            </div>
          )}

          {role === 'retailer' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="shopName">店家名稱</Label>
                <Input id="shopName" placeholder="小熊寶貝童裝店" {...register('shopName')} />
                {errors.shopName && <p className="text-sm text-red-500">{errors.shopName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingAddress">收件地址</Label>
                <Input id="shippingAddress" placeholder="台北市信義區..." {...register('shippingAddress')} />
                {errors.shippingAddress && (
                  <p className="text-sm text-red-500">{errors.shippingAddress.message}</p>
                )}
              </div>
            </>
          )}

          {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '註冊中...' : '建立帳號'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          已有帳號？{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            立即登入
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
