'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMyProducts } from '@/hooks/use-products'
import { ProductTable } from '@/components/wholesaler/ProductTable'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function WholesalerProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError } = useMyProducts({ page, search })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">商品管理</h1>
        <Button size="sm" onClick={() => router.push('/wholesaler/products/new')}>+ 新增商品</Button>
      </div>

      <main className="p-6 max-w-6xl mx-auto space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="搜尋商品名稱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline">搜尋</Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            >
              清除
            </Button>
          )}
        </form>

        <div className="bg-white rounded-lg border p-6">
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-center text-red-500 py-8">載入失敗，請重新整理頁面</p>
          )}

          {data && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">共 {data.pagination.total} 件商品</p>
              </div>
              <ProductTable products={data.data} />

              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
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
        </div>
      </main>
    </div>
  )
}
