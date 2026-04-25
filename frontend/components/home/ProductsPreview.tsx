import Link from 'next/link'
import { api } from '@/lib/api'

type PreviewProduct = {
  id: string
  name: string
  basePrice: string
  primaryImageUrl: string | null
  category: string
  shop: { id: string; name: string }
}

async function getProducts(): Promise<PreviewProduct[]> {
  try {
    const res = await api.get<{ data: PreviewProduct[] }>('/products', {
      params: { page: 1, pageSize: 8 },
    })
    return res.data.data
  } catch {
    return []
  }
}

export default async function ProductsPreview() {
  const products = await getProducts()

  if (products.length === 0) {
    return <p className="text-center text-gray-400 py-8">目前還沒有商品，敬請期待</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="group border rounded-lg overflow-hidden bg-white hover:shadow-md hover:border-gray-300 transition-all"
        >
          <div className="aspect-square bg-gray-100 overflow-hidden">
            {p.primaryImageUrl ? (
              <img
                src={p.primaryImageUrl}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                👕
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-400 truncate">{p.shop.name}</p>
            <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{p.name}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              NT${Number(p.basePrice).toLocaleString('zh-TW')}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
