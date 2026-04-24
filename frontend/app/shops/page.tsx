'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useShops } from '@/hooks/use-shops'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ShopsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError } = useShops({ page, search })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900 shrink-0">所有商城</h1>
        <div className="relative max-w-xs w-full">
          <Input
            placeholder="搜尋商城名稱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pr-8"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <main className="p-6 max-w-5xl mx-auto">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-16">載入失敗，請重新整理頁面</p>
        )}

        {data && data.data.length === 0 && (
          <p className="text-center text-gray-400 py-16">
            {search ? `找不到「${search}」相關商城` : '目前還沒有商城'}
          </p>
        )}

        {data && data.data.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">共 {data.pagination.total} 家商城</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.data.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/shops/${shop.slug}`}
                  className="bg-white rounded-lg border overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  {/* Banner */}
                  <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {shop.bannerUrl ? (
                      <img
                        src={shop.bannerUrl}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">
                        🏪
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={`${shop.name} logo`}
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          {shop.name[0]}
                        </div>
                      )}
                      <h2 className="font-semibold text-gray-900 truncate">{shop.name}</h2>
                    </div>

                    {shop.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{shop.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                      <span>{shop._count.products} 件商品</span>
                      {Number(shop.minOrderAmount) > 0 && (
                        <span>
                          最低 NT${Number(shop.minOrderAmount).toLocaleString('zh-TW')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一頁
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一頁
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
