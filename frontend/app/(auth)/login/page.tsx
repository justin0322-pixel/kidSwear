import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: '登入 | 童裝批發訂單平台' }

export default function LoginPage() {
  return <LoginForm />
}
