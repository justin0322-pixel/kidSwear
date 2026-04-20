'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useShopBySlug } from '@/hooks/use-shops'
import { Navbar } from '@/components/layout/Navbar'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Product } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['全部', '上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']

type ProductsResponse = {
  data: Product[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

function useShopProducts(shopId: string | undefined, params: { page: number; category: string; search: string }) {
  return useQuery({
    queryKey: ['shop-products', shopId, params],
    queryFn: async () => {
      const res = await api.get<ProductsResponse>('/products', {
        params: {
          shopId,
          page: params.page,
          pageSize: 20,
          ...(params.category && params.category !== '全部' && { category: params.category }),
          ...(params.search && { search: params.search }),
        },
      })
      return res.data
    },
    enabled: !!shopId,
  })
}

export default function ShopPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('全部')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data: shop, isLoading: shopLoading, isError: shopError } = useShopBySlug(slug)
  const { data: products, isLoading: productsLoading } = useShopProducts(shop?.id, { page, category, search })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleCategoryChange = (cat: string) => {
    setCategory(cat)
    setPage(1)
  }

  if (shopError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">找不到這家商城</p>
          <button
            type="button"
            onClick={() => router.push('/shops')}
            className="mt-4 text-sm text-blue-500 hover:underline"
          >
            返回商城列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* 商城 Banner */}
      <div className="bg-white border-b">
        {shop?.bannerUrl ? (
          <div className="h-40 overflow-hidden">
            <img src={shop.bannerUrl} alt={shop.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          {shopLoading ? (
            <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-3">
              {shop?.logoUrl && (
                <img src={shop.logoUrl} alt={shop.name} className="w-10 h-10 rounded-full object-cover border" />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{shop?.name}</h1>
                {shop?.description && (
                  <p className="text-sm text-gray-500">{shop.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="p-6 max-w-5xl mx-auto space-y-4">
        {/* 搜尋 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="搜尋商品名稱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline">搜尋</Button>
          {search && (
            <Button type="button" variant="outline" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
              清除
            </Button>
          )}
        </form>

        {/* 品類篩選 */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                category === cat
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 商品格 */}
        {(shopLoading || productsLoading) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-56 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {products && products.data.length === 0 && (
          <p className="text-center text-gray-400 py-16">這個分類目前沒有商品</p>
        )}

        {products && products.data.length > 0 && (
          <>
            <p className="text-sm text-gray-500">共 {products.pagination.total} 件商品</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.data.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => router.push(`/products/${product.id}`)}
                  className="bg-white rounded-lg border overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {product.primaryImageUrl ? (
                      <img
                        src={product.primaryImageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      NT${Number(product.basePrice).toLocaleString('zh-TW')}
                    </p>
                    {product.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {product.tags.slice(0, 2).map((tag) => (
                          <span key={tag.id} className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {products.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  上一頁
                </Button>
                <span className="text-sm text-gray-600">{page} / {products.pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === products.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
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
