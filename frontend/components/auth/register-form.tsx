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
