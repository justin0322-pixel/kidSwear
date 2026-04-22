'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

type AdminShop = {
  id: string
  name: string
  slug: string
  isActive: boolean
  productCount: number
  ownerEmail: string
  companyName: string
  createdAt: string
}

type ShopsResponse = {
  items: AdminShop[]
  total: number
  page: number
  pageSize: number
}

function useAdminShops(page: number) {
  return useQuery({
    queryKey: ['admin-shops', page],
    queryFn: async () => {
      const res = await api.get<{ data: ShopsResponse }>('/admin/shops', {
        params: { page, pageSize: 20 },
      })
      return res.data.data
    },
  })
}

function useToggleShopStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      await api.patch(`/admin/shops/${id}/status`, { status })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shops'] }),
  })
}

export default function AdminShopsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminShops(page)
  const { mutate: toggleStatus, isPending } = useToggleShopStatus()

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">商城管理</h1>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <p className="text-sm text-gray-500">共 {data.total} 家商城</p>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">商城名稱</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">負責人</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">商品數</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">狀態</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">建立日期</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-gray-400 text-xs">{s.companyName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.ownerEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{s.productCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.isActive ? '上架中' : '已下架'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={s.isActive ? 'outline' : 'default'}
                        disabled={isPending}
                        onClick={() => toggleStatus({
                          id: s.id,
                          status: s.isActive ? 'inactive' : 'active',
                        })}
                      >
                        {s.isActive ? '下架' : '上架'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一頁</Button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一頁</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
