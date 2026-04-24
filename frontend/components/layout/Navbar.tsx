'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore, type AppNotification } from '@/stores/notification-store'
import { useCart } from '@/hooks/use-cart'

// ─── Bell dropdown ────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  return `${Math.floor(diff / 86400)} 天前`
}

function NotificationItem({ n }: { n: AppNotification }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
        !n.read ? 'bg-blue-50/50' : ''
      }`}
      onClick={() => router.push(
        n.type === 'new_order'
          ? `/wholesaler/orders/${n.orderId}`
          : `/retailer/orders/${n.orderId}`,
      )}
    >
      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
        n.type === 'new_order' ? 'bg-blue-400' : 'bg-green-400'
      } ${!n.read ? 'opacity-100' : 'opacity-0'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead } = useNotificationStore()

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="通知"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border shadow-lg z-20 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">通知</p>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                >
                  全部標為已讀
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">目前沒有通知</p>
              ) : (
                notifications.map((n) => <NotificationItem key={n.id} n={n} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const router = useRouter()
  const { user, clear } = useAuthStore()
  const { data: cart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  const handleLogout = async () => {
    const { api } = await import('@/lib/api')
    await api.post('/auth/logout').catch(() => null)
    clear()
    router.push('/login')
    setMenuOpen(false)
  }

  const homeHref =
    user?.role === 'wholesaler'
      ? '/wholesaler/dashboard'
      : user?.role === 'retailer'
      ? '/retailer/home'
      : '/'

  // Safe avatar initial: prefer first char of email, fallback to role initial
  const avatarChar = user
    ? (user.email?.[0] ?? user.role[0]).toUpperCase()
    : ''

  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={homeHref} className="text-lg font-bold text-gray-900 shrink-0">
          童裝批發平台
        </Link>

        {/* 中間導覽 */}
        <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
          <Link href="/shops" className="hover:text-gray-900 transition-colors">
            瀏覽商城
          </Link>
          {user?.role === 'retailer' && (
            <>
              <Link href="/retailer/search" className="hover:text-gray-900 transition-colors">
                搜尋商品
              </Link>
              <Link href="/retailer/orders" className="hover:text-gray-900 transition-colors">
                我的訂單
              </Link>
            </>
          )}
          {user?.role === 'wholesaler' && (
            <>
              <Link href="/wholesaler/products" className="hover:text-gray-900 transition-colors">
                商品管理
              </Link>
              <Link href="/wholesaler/orders" className="hover:text-gray-900 transition-colors">
                訂單管理
              </Link>
              <Link href="/wholesaler/analytics" className="hover:text-gray-900 transition-colors">
                數據分析
              </Link>
            </>
          )}
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-1">
          {/* 購物車（只給零售商） */}
          {user?.role === 'retailer' && (
            <Link
              href="/retailer/cart"
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* 通知鈴鐺（已登入） */}
          {user && <NotificationBell />}

          {/* 未登入 */}
          {!user && (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                登入
              </Link>
              <Link
                href="/register"
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                註冊
              </Link>
            </div>
          )}

          {/* 已登入：使用者選單 */}
          {user && (
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                  {avatarChar}
                </div>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg border shadow-lg z-20 py-1 text-sm">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-gray-900 truncate">
                        {user.email || '（未設定 Email）'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {user.role === 'wholesaler' ? '批發商' : '零售商'}
                      </p>
                    </div>

                    {user.role === 'retailer' && (
                      <>
                        <Link
                          href="/retailer/home"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          首頁
                        </Link>
                        <Link
                          href="/retailer/search"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          搜尋商品
                        </Link>
                        <Link
                          href="/retailer/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          我的訂單
                        </Link>
                        <Link
                          href="/retailer/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          個人資料
                        </Link>
                      </>
                    )}

                    {user.role === 'wholesaler' && (
                      <>
                        <Link
                          href="/wholesaler/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          儀表板
                        </Link>
                        <Link
                          href="/wholesaler/products"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          商品管理
                        </Link>
                        <Link
                          href="/wholesaler/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          訂單管理
                        </Link>
                        <Link
                          href="/wholesaler/analytics"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          數據分析
                        </Link>
                        <Link
                          href="/wholesaler/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          帳號設定
                        </Link>
                      </>
                    )}

                    <div className="border-t mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        登出
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
