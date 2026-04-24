'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useProduct } from '@/hooks/use-products'
import { useAddToCart } from '@/hooks/use-cart'
import { Navbar } from '@/components/layout/Navbar'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { SearchResultItem } from '@/hooks/use-search'
import { useRecentlyViewed } from '@/hooks/use-recently-viewed'

type SimilarResponse = { items: SearchResultItem[]; total: number }

function useSimilarProducts(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['similar', productId],
    queryFn: async () => {
      const res = await api.get<{ data: SimilarResponse }>('/recommendations/similar', {
        params: { productId, limit: 4 },
      })
      return res.data.data.items
    },
    enabled,
  })
}

const GENDER_LABEL: Record<string, string> = {
  male: '男童',
  female: '女童',
  unisex: '不限',
}

export default function ProductDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()

  const { data: product, isLoading, isError } = useProduct(Number(id))
  const { mutate: addToCart, isPending: addingToCart } = useAddToCart()
  const { data: similarItems } = useSimilarProducts(id, !!id && !isLoading && !isError)
  const { trackView } = useRecentlyViewed()

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)

  useEffect(() => {
    if (!product) return
    trackView({
      id: Number(id),
      name: product.name,
      basePrice: product.basePrice,
      primaryImageUrl: product.images[0]?.url ?? null,
      shopName: product.shop.name,
      shopSlug: product.shop.slug,
    })
  // trackView is stable (useCallback), run only when product first loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, trackView])

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">找不到這件商品</p>
          <button type="button" onClick={() => router.back()} className="mt-4 text-sm text-blue-500 hover:underline">
            返回上一頁
          </button>
        </div>
      </div>
    )
  }

  // 從已選尺寸/顏色推算可用選項
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

  const selectedVariant = product?.variants?.find(
    (v) => v.size === selectedSize && v.color === selectedColor,
  ) ?? null

  const isOutOfStock = selectedVariant ? selectedVariant.stock === 0 : false

  const handleAddToCart = () => {
    if (!user) { router.push('/login'); return }
    if (!selectedVariant) return

    addToCart(
      { variantId: Number(selectedVariant.id), quantity },
      {
        onSuccess: () => {
          setAddedFeedback(true)
          setTimeout(() => setAddedFeedback(false), 2000)
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="border-b px-6 py-3 flex items-center gap-2 text-sm text-gray-400 max-w-4xl mx-auto">
        <button type="button" onClick={() => router.back()} className="hover:text-gray-600 transition-colors">
          ← 返回
        </button>
        {product && (
          <>
            <span>/</span>
            <button
              type="button"
              onClick={() => router.push(`/shops/${product.shop.slug}`)}
              className="text-gray-500 hover:text-gray-800 transition-colors"
            >
              {product.shop.name}
            </button>
          </>
        )}
      </div>

      {isLoading && (
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {product && (
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 圖片區 */}
          <div className="space-y-3">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">👕</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 shrink-0 transition-colors ${
                      selectedImage === i ? 'border-gray-900' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 商品資訊 */}
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap gap-1 mb-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-2xl font-bold text-gray-900">
                  NT${Number(selectedVariant?.price ?? product.basePrice).toLocaleString('zh-TW')}
                </span>
                {product.suggestedRetailPrice && (
                  <span className="text-sm text-gray-400">
                    建議售價 NT${Number(product.suggestedRetailPrice).toLocaleString('zh-TW')}
                  </span>
                )}
              </div>
            </div>

            {/* 規格標籤 */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="bg-gray-50 px-3 py-1 rounded-full">{product.category}</span>
              {product.ageRange && (
                <span className="bg-gray-50 px-3 py-1 rounded-full">{product.ageRange}</span>
              )}
              {product.gender && (
                <span className="bg-gray-50 px-3 py-1 rounded-full">
                  {GENDER_LABEL[product.gender] ?? product.gender}
                </span>
              )}
            </div>

            {/* 尺寸選擇 */}
            {sizes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">尺寸</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setSelectedSize(size); setSelectedColor(null) }}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
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

            {/* 顏色選擇 */}
            {selectedSize && colors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">顏色</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
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

            {/* 庫存顯示 */}
            {selectedVariant && (
              <p className={`text-sm ${selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {selectedVariant.stock > 0 ? `庫存 ${selectedVariant.stock} 件` : '缺貨中'}
              </p>
            )}

            {/* 數量 */}
            {selectedVariant && !isOutOfStock && (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-700">數量</p>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* 加入購物車 */}
            {user?.role === 'retailer' && (
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedVariant || isOutOfStock || addingToCart}
                onClick={handleAddToCart}
              >
                {addedFeedback
                  ? '✓ 已加入購物車'
                  : !selectedSize
                  ? '請選擇尺寸'
                  : !selectedColor
                  ? '請選擇顏色'
                  : isOutOfStock
                  ? '缺貨中'
                  : addingToCart
                  ? '加入中...'
                  : '加入購物車'}
              </Button>
            )}

            {!user && (
              <Button className="w-full" size="lg" variant="outline" onClick={() => router.push('/login')}>
                登入後加入購物車
              </Button>
            )}

            {/* 商品描述 */}
            {product.description && (
              <div className="border-t pt-5 space-y-2">
                <p className="text-sm font-medium text-gray-700">商品描述</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 視覺相似商品 */}
      {similarItems && similarItems.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <section className="border-t pt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">視覺相似商品</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {item.primary_image_url ? (
                      <img
                        src={item.primary_image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      NT${Number(item.base_price).toLocaleString('zh-TW')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.shop.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
