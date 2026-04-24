'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Product, type ProductStatus, useDeleteProduct, useToggleProductStatus } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'

type Props = {
  products: Product[]
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  active: '已上架',
  draft: '已下架',
  sold_out: '已售完',
  archived: '已封存',
}

const STATUS_STYLE: Record<ProductStatus, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  sold_out: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-500',
}

function ProductRow({ product }: { product: Product }) {
  const router = useRouter()
  const { mutate: deleteProduct, isPending: deleting } = useDeleteProduct()
  const { mutate: toggleStatus, isPending: toggling } = useToggleProductStatus()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isActive = product.status === 'active'
  const canToggle = product.status === 'active' || product.status === 'draft'

  const handleDelete = () => {
    if (confirmDelete) {
      deleteProduct(product.id)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50 align-top">
      {/* 商品 */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-3">
          {product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={product.name}
              className="w-10 h-10 rounded object-cover bg-gray-100 shrink-0 mt-0.5"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0 mt-0.5">
              無圖
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-medium text-gray-900 leading-snug">{product.name}</span>
            <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[product.status]}`}>
              {STATUS_LABEL[product.status]}
            </span>
            {(product.lowStockCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {product.lowStockCount} 個規格庫存不足
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 品類 */}
      <td className="py-3 pr-4 text-gray-600 text-sm">{product.category}</td>

      {/* 批發價 */}
      <td className="py-3 pr-4 text-gray-900 text-sm tabular-nums">
        NT${Number(product.basePrice).toLocaleString('zh-TW')}
      </td>

      {/* 標籤 */}
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

      {/* 操作 */}
      <td className="py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 上架 / 下架 */}
          {canToggle && (
            <Button
              variant="outline"
              size="sm"
              disabled={toggling}
              onClick={() =>
                toggleStatus({ id: product.id, status: isActive ? 'draft' : 'active' })
              }
              className={isActive
                ? 'text-gray-600 hover:border-gray-400'
                : 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500'}
            >
              {toggling ? '...' : isActive ? '下架' : '上架'}
            </Button>
          )}

          {/* 編輯 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/wholesaler/products/${product.id}/edit`)}
          >
            編輯
          </Button>

          {/* 刪除（軟刪除） */}
          <Button
            variant="outline"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
            className={confirmDelete ? 'border-red-400 text-red-500 hover:bg-red-50' : ''}
          >
            {confirmDelete ? '確認刪除' : '刪除'}
          </Button>
          {confirmDelete && (
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600"
              onClick={() => setConfirmDelete(false)}
            >
              取消
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function ProductTable({ products }: Props) {
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
            <th className="pb-3 pr-4 font-medium">標籤</th>
            <th className="pb-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
