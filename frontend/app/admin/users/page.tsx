'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

type AdminUser = {
  id: string
  email: string | null
  role: 'wholesaler' | 'retailer' | 'admin'
  status: 'active' | 'suspended'
  displayName: string
  createdAt: string
  lastLoginAt: string | null
}

type UsersResponse = {
  items: AdminUser[]
  total: number
  page: number
  pageSize: number
}

const ROLE_LABEL: Record<AdminUser['role'], string> = {
  wholesaler: '批發商',
  retailer: '零售商',
  admin: '管理員',
}

const STATUS_LABEL: Record<AdminUser['status'], string> = {
  active: '正常',
  suspended: '停權',
}

function useAdminUsers(page: number, role?: string) {
  return useQuery({
    queryKey: ['admin-users', page, role],
    queryFn: async () => {
      const res = await api.get<{ data: UsersResponse }>('/admin/users', {
        params: { page, pageSize: 20, ...(role && { role }) },
      })
      return res.data.data
    },
  })
}

function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) => {
      await api.patch(`/admin/users/${id}/status`, { status })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const { data, isLoading } = useAdminUsers(page, roleFilter || undefined)
  const { mutate: toggleStatus, isPending } = useToggleUserStatus()

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">使用者管理</h1>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="text-sm border rounded-md px-3 py-1.5 text-gray-700"
        >
          <option value="">全部角色</option>
          <option value="wholesaler">批發商</option>
          <option value="retailer">零售商</option>
        </select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <p className="text-sm text-gray-500">共 {data.total} 位使用者</p>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">名稱 / Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">狀態</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">最後登入</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.displayName}</p>
                      <p className="text-gray-400 text-xs">{u.email ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('zh-TW') : '未登入'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant={u.status === 'active' ? 'outline' : 'default'}
                          disabled={isPending}
                          onClick={() => toggleStatus({
                            id: u.id,
                            status: u.status === 'active' ? 'suspended' : 'active',
                          })}
                        >
                          {u.status === 'active' ? '停權' : '啟用'}
                        </Button>
                      )}
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
