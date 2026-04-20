'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Product, useDeleteProduct } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'

type Props = {
  products: Product[]
}

export function ProductTable({ products }: Props) {
  const router = useRouter()
  const { mutate: deleteProduct, isPending } = useDeleteProduct()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const handleDelete = (id: number) => {
    if (confirmId === id) {
      deleteProduct(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">還沒有商品</p>
        <p className="text-sm mt-1">點右上角「新增商品」開始上架</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-3 pr-4 font-medium">商品</th>
            <th className="pb-3 pr-4 font-medium">品類</th>
            <th className="pb-3 pr-4 font-medium">批發價</th>
            <th className="pb-3 pr-4 font-medium">變體數</th>
            <th className="pb-3 pr-4 font-medium">標籤</th>
            <th className="pb-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  {product.primaryImageUrl ? (
                    <img
                      src={product.primaryImageUrl}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                      無圖
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{product.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-600">{product.category}</td>
              <td className="py-3 pr-4 text-gray-900">
                NT${Number(product.basePrice).toLocaleString('zh-TW')}
              </td>
              <td className="py-3 pr-4 text-gray-600">{product.variants.length} 個</td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
                      style={tag.color ? { backgroundColor: tag.color + '22', color: tag.color } : undefined}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {product.tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                      +{product.tags.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/wholesaler/products/${product.id}/edit`)}
                  >
                    編輯
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(product.id)}
                    className={confirmId === product.id ? 'border-red-400 text-red-500 hover:bg-red-50' : ''}
                  >
                    {confirmId === product.id ? '確認刪除' : '刪除'}
                  </Button>
                  {confirmId === product.id && (
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setConfirmId(null)}
                    >
                      取消
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
