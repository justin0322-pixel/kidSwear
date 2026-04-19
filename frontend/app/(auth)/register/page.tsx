import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: '註冊 | 童裝批發訂單平台' }

export default function RegisterPage() {
  return <RegisterForm />
}
