'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMyShop } from '@/hooks/use-shop'
import {
  useVipMembers, useAddVipMember, useRemoveVipMember,
  useVipDiscounts, useRemoveVipDiscount,
  useSetVipMode,
} from '@/hooks/use-vip'

// ── 新增 VIP 成員表單 ──────────────────────────────────────────────────────────

const memberSchema = z.object({ email: z.string().email('請輸入有效的 Email') })
type MemberForm = z.infer<typeof memberSchema>

function AddMemberForm() {
  const { mutate, isPending, error, isSuccess, reset: resetMutation } = useAddVipMember()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  })
  const onSubmit = (v: MemberForm) => {
    mutate(v.email, {
      onSuccess: () => { reset(); setTimeout(() => resetMutation(), 2000) },
    })
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <Label htmlFor="vip-email">零售商 Email</Label>
        <Input id="vip-email" placeholder="retailer@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isPending} className="shrink-0">
        {isPending ? '新增中...' : '新增 VIP'}
      </Button>
      {isSuccess && <span className="text-sm text-green-600 self-center">已新增</span>}
      {error && (
        <span className="text-sm text-red-500 self-center">
          {(error as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? '新增失敗'}
        </span>
      )}
    </form>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────

export default function VipPage() {
  const { data: shop } = useMyShop()
  const { data: members = [], isLoading: membersLoading } = useVipMembers()
  const { data: discounts = [], isLoading: discountsLoading } = useVipDiscounts()
  const { mutate: removeMembers, isPending: removingMember } = useRemoveVipMember()
  const { mutate: removeDiscount } = useRemoveVipDiscount()
  const { mutate: setVipMode, isPending: togglingMode } = useSetVipMode()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removingDiscountId, setRemovingDiscountId] = useState<string | null>(null)

  const handleRemoveMember = (retailerId: string) => {
    setRemovingId(retailerId)
    removeMembers(retailerId, { onSettled: () => setRemovingId(null) })
  }

  const handleRemoveDiscount = (variantId: string) => {
    setRemovingDiscountId(variantId)
    removeDiscount(variantId, { onSettled: () => setRemovingDiscountId(null) })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">VIP 管理</h1>

        {/* VIP 商城模式 */}
        <section className="bg-white rounded-lg border p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">VIP 商城模式</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                開啟後，非 VIP 零售商進入商城後看不到商品也無法下單
              </p>
            </div>
            <button
              type="button"
              disabled={togglingMode || !shop}
              onClick={() => shop && setVipMode(!shop.isVipOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                shop?.isVipOnly ? 'bg-amber-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  shop?.isVipOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {shop?.isVipOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
              目前為 VIP 商城模式 — 僅限 VIP 成員可瀏覽商品與下單
            </div>
          )}
        </section>

        {/* VIP 成員管理 */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">VIP 成員</h2>
          <AddMemberForm />

          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">尚無 VIP 成員</p>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.shopName}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={removingId === m.retailerId && removingMember}
                    onClick={() => handleRemoveMember(m.retailerId)}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* VIP 折扣設定 */}
        <section className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">VIP 折扣設定</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                在商品管理頁面的各規格旁設定折扣，設定後會顯示於此
              </p>
            </div>
          </div>

          {discountsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : discounts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">尚未設定任何 VIP 折扣</p>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {discounts.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.productName}</p>
                    <p className="text-xs text-gray-400">
                      {d.size} · {d.color}
                      {' '}—{' '}
                      {d.discountType === 'percentage'
                        ? `${d.discountValue}% 折扣（${(100 - Number(d.discountValue))} 折）`
                        : `固定 VIP 價 NT$${Number(d.discountValue).toLocaleString('zh-TW')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={removingDiscountId === d.variantId}
                    onClick={() => handleRemoveDiscount(d.variantId)}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
