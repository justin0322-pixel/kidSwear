import Link from 'next/link'
import { api } from '@/lib/api'

type Shop = {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  minOrderAmount: string
  _count: { products: number }
}

async function getShops(): Promise<Shop[]> {
  try {
    const res = await api.get<{ data: Shop[] }>('/shops', {
      params: { page: 1, pageSize: 6 },
    })
    return res.data.data
  } catch {
    return []
  }
}

export default async function ShopsPreview() {
  const shops = await getShops()

  if (shops.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">目前還沒有商城，敬請期待</p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {shops.map((shop) => (
        <Link
          key={shop.id}
          href={`/shops/${shop.slug}`}
          className="bg-white rounded-lg border overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
        >
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
                  className="w-7 h-7 rounded-full object-cover border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  {shop.name[0]}
                </div>
              )}
              <h3 className="font-semibold text-gray-900 truncate">{shop.name}</h3>
            </div>
            {shop.description && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{shop.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{shop._count.products} 件商品</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
