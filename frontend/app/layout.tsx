import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '童裝批發訂單平台',
  description: 'B2B 童裝批發訂單管理平台，整合 AI 推薦系統',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
