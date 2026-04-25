'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useShopBySlug } from '@/hooks/use-shops'
import { Navbar } from '@/components/layout/Navbar'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useProduct } from '@/hooks/use-products'
import { useAddToCart } from '@/hooks/use-cart'
import { useAuthStore } from '@/stores/auth-store'
import type { Product } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['全部', '上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']

type ProductsResponse = {
  data: (Product & { vipPrice?: string })[]
  meta: { isVipOnly: boolean; isVipMember: boolean }
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

// ─── Quick-add modal ─────────────────────────────────────────────────────────

type QuickAddModalProps = {
  productId: number
  onClose: () => void
}

function QuickAddModal({ productId, onClose }: QuickAddModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: product, isLoading } = useProduct(productId)
  const { mutate: addToCart, isPending } = useAddToCart()

  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [done, setDone] = useState(false)

  const sizes = product
    ? Array.from(new Set((product.variants ?? []).map((v) => v.size)))
    : []

  const colors = product
    ? Array.from(
        new Set(
          (product.variants ?? [])
            .filter((v) => !selectedSize || v.size === selectedSize)
            .map((v) => v.color),
        ),
      )
    : []

  const selectedVariant =
    product?.variants?.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null

  const handleAdd = () => {
    if (!user) { router.push('/login'); return }
    if (!selectedVariant) return
    addToCart(
      { variantId: Number(selectedVariant.id), quantity },
      {
        onSuccess: () => {
          setDone(true)
          setTimeout(onClose, 900)
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* panel */}
      <div
        className="relative z-10 bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {product?.images[0]?.url && (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0"
              />
            )}
            <div className="min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="font-semibold text-gray-900 line-clamp-2 text-sm">{product?.name}</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    NT${Number(product?.basePrice ?? 0).toLocaleString('zh-TW')}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0 mt-0.5"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 w-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && product && (
          <>
            {/* 尺寸 */}
            {sizes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">尺寸</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setSelectedSize(size); setSelectedColor(null) }}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        selectedSize === size
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 顏色 */}
            {selectedSize && colors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">顏色</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        selectedColor === color
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 庫存 */}
            {selectedVariant && (
              <p className={`text-xs ${selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {selectedVariant.stock > 0 ? `庫存 ${selectedVariant.stock} 件` : '缺貨中'}
              </p>
            )}

            {/* 數量 + 加入按鈕 */}
            <div className="flex items-center gap-3 pt-1">
              {selectedVariant && selectedVariant.stock > 0 && (
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    −
                  </button>
                  <span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
              )}

              <Button
                className="flex-1"
                disabled={!selectedVariant || selectedVariant.stock === 0 || isPending || done}
                onClick={handleAdd}
              >
                {done
                  ? '✓ 已加入'
                  : isPending
                  ? '加入中...'
                  : !selectedSize
                  ? '請選擇尺寸'
                  : !selectedColor
                  ? '請選擇顏色'
                  : selectedVariant?.stock === 0
                  ? '缺貨中'
                  : '加入購物車'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Cart icon SVG ────────────────────────────────────────────────────────────

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuthStore()

  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('全部')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [quickAddId, setQuickAddId] = useState<number | null>(null)

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

  const openQuickAdd = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    setQuickAddId(productId)
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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{shop?.name}</h1>
                  {shop?.isVipOnly && (
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      VIP 商城
                    </span>
                  )}
                </div>
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

        {/* VIP 商城門禁 */}
        {products?.meta?.isVipOnly && !products.meta.isVipMember && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
              🔒
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">此為 VIP 專屬商城</p>
              <p className="text-sm text-gray-500 mt-1">
                您尚未取得此商城的 VIP 資格，無法瀏覽商品
              </p>
            </div>
          </div>
        )}

        {products && !products.meta?.isVipOnly && products.data.length === 0 && (
          <p className="text-center text-gray-400 py-16">這個分類目前沒有商品</p>
        )}

        {products && products.data.length > 0 && !products.meta?.isVipOnly && (
          <>
            <p className="text-sm text-gray-500">共 {products.pagination.total} 件商品</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.data.map((product) => (
                <div key={product.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => router.push(`/products/${product.id}`)}
                    className="w-full bg-white rounded-lg border overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-all"
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
                    <div className="p-3 pb-4">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
                      {product.vipPrice ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-sm font-semibold text-amber-600">
                            VIP NT${Number(product.vipPrice).toLocaleString('zh-TW')} 起
                          </p>
                          <p className="text-xs text-gray-400 line-through">
                            NT${Number(product.basePrice).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">
                          NT${Number(product.basePrice).toLocaleString('zh-TW')}
                        </p>
                      )}
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

                  {/* 快速加購按鈕 */}
                  <button
                    type="button"
                    onClick={(e) => openQuickAdd(e, Number(product.id))}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 focus:opacity-100"
                    aria-label="快速加入購物車"
                  >
                    <CartIcon />
                  </button>
                </div>
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

      {quickAddId !== null && (
        <QuickAddModal
          productId={quickAddId}
          onClose={() => setQuickAddId(null)}
        />
      )}
    </div>
  )
}
