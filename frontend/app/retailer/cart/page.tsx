'use client'

import { useRouter } from 'next/navigation'
import { useCart, useUpdateCartItem, useRemoveCartItem, type CartItem } from '@/hooks/use-cart'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'

type ShopGroup = {
  shopId: string
  shopName: string
  shopSlug: string
  items: CartItem[]
  subtotal: number
}

function groupByShop(items: CartItem[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>()
  for (const item of items) {
    const group = map.get(item.shopId) ?? {
      shopId: item.shopId,
      shopName: item.shopName,
      shopSlug: item.shopSlug,
      items: [],
      subtotal: 0,
    }
    group.items.push(item)
    group.subtotal += Number(item.subtotal)
    map.set(item.shopId, group)
  }
  return Array.from(map.values())
}

function QuantityControl({
  item,
  disabled,
}: {
  item: CartItem
  disabled: boolean
}) {
  const { mutate: updateItem } = useUpdateCartItem()
  const { mutate: removeItem } = useRemoveCartItem()

  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <button
        type="button"
        disabled={disabled || item.quantity <= 1}
        onClick={() =>
          updateItem({ variantId: Number(item.variantId), quantity: item.quantity - 1 })
        }
        className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm select-none"
      >
        −
      </button>
      <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center tabular-nums">
        {item.quantity}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          updateItem({ variantId: Number(item.variantId), quantity: item.quantity + 1 })
        }
        className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm select-none"
      >
        +
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => removeItem(Number(item.variantId))}
        className="px-3 py-1.5 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors text-base border-l select-none"
        aria-label="移除"
      >
        ×
      </button>
    </div>
  )
}

function CartItemRow({ item, disabled }: { item: CartItem; disabled: boolean }) {
  const router = useRouter()
  return (
    <div className="p-4 flex gap-3">
      <button
        type="button"
        onClick={() => router.push(`/products/${item.productId}`)}
        className="w-18 h-18 shrink-0"
        style={{ width: 72, height: 72 }}
      >
        <div className="w-full h-full rounded-lg bg-gray-100 overflow-hidden">
          {item.primaryImageUrl ? (
            <img
              src={item.primaryImageUrl}
              alt={item.productName}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
              👕
            </div>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => router.push(`/products/${item.productId}`)}
          className="font-medium text-gray-900 text-sm truncate block text-left hover:underline"
        >
          {item.productName}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">
          {item.size} · {item.color}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          NT${Number(item.unitPrice).toLocaleString('zh-TW')} / 件
        </p>

        <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
          <QuantityControl item={item} disabled={disabled} />
          <p className="font-semibold text-gray-900 text-sm tabular-nums">
            NT${Number(item.subtotal).toLocaleString('zh-TW')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const router = useRouter()
  const { data: cart, isLoading, isError } = useCart()

  const groups = cart ? groupByShop(cart.items) : []
  const totalQuantity = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  const isMultiShop = groups.length > 1

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">
          購物車
          {totalQuantity > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{totalQuantity} 件</span>
          )}
        </h1>
      </div>

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
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-gray-500 text-base font-medium">購物車是空的</p>
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
            {/* 多商城提示 */}
            {isMultiShop && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                購物車包含來自 <strong>{groups.length} 個商城</strong> 的商品，結帳時將分別建立 {groups.length} 筆訂單。
              </div>
            )}

            {/* 依商城分組 */}
            {groups.map((group) => (
              <div key={group.shopId} className="bg-white rounded-lg border overflow-hidden">
                {/* 商城 Header */}
                <button
                  type="button"
                  onClick={() => router.push(`/shops/${group.shopSlug}`)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-base">🏪</span>
                  <span className="text-sm font-medium text-gray-900">{group.shopName}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {group.items.length} 件 · NT${group.subtotal.toLocaleString('zh-TW')}
                  </span>
                  <span className="text-gray-300 text-xs">→</span>
                </button>

                {/* 商品列表 */}
                <div className="divide-y">
                  {group.items.map((item) => (
                    <CartItemRow key={item.variantId} item={item} disabled={false} />
                  ))}
                </div>
              </div>
            ))}

            {/* 結帳摘要 */}
            <div className="bg-white rounded-lg border p-5 space-y-3">
              {isMultiShop && (
                <div className="space-y-2 pb-3 border-b">
                  {groups.map((group) => (
                    <div key={group.shopId} className="flex justify-between text-sm text-gray-500">
                      <span>{group.shopName}</span>
                      <span>NT${group.subtotal.toLocaleString('zh-TW')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-600">
                <span>商品小計（{totalQuantity} 件）</span>
                <span>NT${Number(cart.total).toLocaleString('zh-TW')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>運費</span>
                <span>結帳時計算</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                <span>預估總計</span>
                <span>NT${Number(cart.total).toLocaleString('zh-TW')}</span>
              </div>

              <Button
                className="w-full mt-1"
                size="lg"
                onClick={() => router.push('/retailer/checkout')}
              >
                {isMultiShop
                  ? `前往結帳（${groups.length} 筆訂單）`
                  : '前往結帳'}
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
