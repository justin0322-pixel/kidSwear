'use client'

import { useRouter } from 'next/navigation'
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/hooks/use-cart'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const router = useRouter()
  const { data: cart, isLoading, isError } = useCart()
  const { mutate: updateItem, isPending: updating } = useUpdateCartItem()
  const { mutate: removeItem, isPending: removing } = useRemoveCartItem()

  const isProcessing = updating || removing

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-2xl mx-auto space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">載入失敗，請重新整理頁面</p>
        )}

        {cart && cart.items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">購物車是空的</p>
            <p className="text-gray-400 text-sm mt-1">去逛逛，找到喜歡的商品吧！</p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push('/shops')}
            >
              瀏覽商城
            </Button>
          </div>
        )}

        {cart && cart.items.length > 0 && (
          <>
            {/* 商品列表 */}
            <div className="bg-white rounded-lg border divide-y">
              {cart.items.map((item) => (
                <div key={item.variantId} className="p-4 flex gap-4">
                  {/* 商品圖 */}
                  <div
                    className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                        👕
                      </div>
                    )}
                  </div>

                  {/* 商品資訊 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-gray-900 truncate cursor-pointer hover:underline"
                      onClick={() => router.push(`/products/${item.productId}`)}
                    >
                      {item.productName}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.size} · {item.color}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      NT${Number(item.unitPrice).toLocaleString('zh-TW')} / 件
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      {/* 數量調整 */}
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          disabled={isProcessing || item.quantity <= 1}
                          onClick={() =>
                            updateItem({
                              variantId: Number(item.variantId),
                              quantity: item.quantity - 1,
                            })
                          }
                          className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm"
                        >
                          −
                        </button>
                        <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            updateItem({
                              variantId: Number(item.variantId),
                              quantity: item.quantity + 1,
                            })
                          }
                          className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">
                          NT${Number(item.subtotal).toLocaleString('zh-TW')}
                        </p>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => removeItem(Number(item.variantId))}
                          className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 結帳摘要 */}
            <div className="bg-white rounded-lg border p-5 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>商品小計（{cart.items.length} 件）</span>
                <span>NT${Number(cart.total).toLocaleString('zh-TW')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>運費</span>
                <span className="text-gray-400">結帳時計算</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                <span>預估總計</span>
                <span>NT${Number(cart.total).toLocaleString('zh-TW')}</span>
              </div>

              <Button
                className="w-full mt-2"
                size="lg"
                onClick={() => router.push('/retailer/checkout')}
              >
                前往結帳
              </Button>
              <button
                type="button"
                onClick={() => router.push('/shops')}
                className="w-full text-sm text-center text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                繼續購物
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
