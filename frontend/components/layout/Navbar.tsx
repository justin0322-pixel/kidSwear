'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useCart } from '@/hooks/use-cart'

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
            </>
          )}
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-3">
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

          {/* 未登入 */}
          {!user && (
            <div className="flex items-center gap-2">
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                  {user.email[0].toUpperCase()}
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
                      <p className="font-medium text-gray-900 truncate">{user.email}</p>
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
