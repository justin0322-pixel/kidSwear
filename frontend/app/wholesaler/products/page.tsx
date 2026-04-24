'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMyProducts } from '@/hooks/use-products'
import { ProductTable } from '@/components/wholesaler/ProductTable'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_OPTIONS = [
  { value: '', label: '全部狀態' },
  { value: 'active', label: '上架中' },
  { value: 'draft', label: '草稿' },
  { value: 'sold_out', label: '售完' },
  { value: 'archived', label: '已下架' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分類' },
  { value: '上衣', label: '上衣' },
  { value: '褲子', label: '褲子' },
  { value: '裙子', label: '裙子' },
  { value: '套裝', label: '套裝' },
  { value: '外套', label: '外套' },
  { value: '配件', label: '配件' },
  { value: '其他', label: '其他' },
]

export default function WholesalerProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data, isLoading, isError } = useMyProducts({
    page,
    search,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleFilterChange = (key: 'status' | 'category', value: string) => {
    if (key === 'status') setStatusFilter(value)
    else setCategoryFilter(value)
    setPage(1)
  }

  const hasFilter = search || statusFilter || categoryFilter
  const clearAll = () => {
    setSearch('')
    setSearchInput('')
    setStatusFilter('')
    setCategoryFilter('')
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
        <div className="flex flex-wrap gap-2 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="搜尋商品名稱..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
            />
            <Button type="submit" variant="outline">搜尋</Button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="text-sm border rounded-md px-3 py-2 text-gray-700 bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="text-sm border rounded-md px-3 py-2 text-gray-700 bg-white"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasFilter && (
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              清除篩選
            </Button>
          )}
        </div>

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
