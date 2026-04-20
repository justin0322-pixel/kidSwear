'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMyShop } from '@/hooks/use-shop'
import { useShopTags, type ProductTag } from '@/hooks/use-products'
import { useCreateTag, useDeleteTag } from '@/hooks/use-tags'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, '請填寫標籤名稱').max(50),
  category: z.string().max(30).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '請輸入有效色碼（如 #FFB6C1）')
    .or(z.literal(''))
    .optional(),
})

type FormValues = z.infer<typeof schema>

const PRESET_COLORS = [
  '#FFB6C1', '#FFD700', '#98FB98', '#87CEEB',
  '#DDA0DD', '#F4A460', '#778899', '#FF8C69',
]

export default function WholesalerTagsPage() {
  const router = useRouter()
  const { data: shop } = useMyShop()
  const { data: tags, isLoading } = useShopTags(shop?.id)
  const { mutate: createTag, isPending: creating } = useCreateTag()
  const { mutate: deleteTag, isPending: deleting } = useDeleteTag()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [pickedColor, setPickedColor] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    createTag(
      {
        name: values.name,
        category: values.category || undefined,
        color: values.color || undefined,
      },
      {
        onSuccess: () => {
          reset()
          setPickedColor('')
        },
      },
    )
  }

  const handleDelete = (id: number) => {
    if (confirmId === id) {
      deleteTag(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
    }
  }

  // 只顯示屬於自己商城的標籤（排除 shopId=null 的全域標籤）
  const myTags = tags?.filter((t) => (t as ProductTag & { shopId?: string | null }).shopId !== null) ?? []
  const globalTags = tags?.filter((t) => (t as ProductTag & { shopId?: string | null }).shopId === null) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">標籤管理</h1>
      </div>

      <main className="p-6 max-w-2xl mx-auto space-y-6">
        {/* 新增表單 */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">新增標籤</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">標籤名稱 *</Label>
                <Input id="name" placeholder="例：可愛" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">分類（選填）</Label>
                <Input id="category" placeholder="例：風格、材質" {...register('category')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>顏色（選填）</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setPickedColor(c)
                      setValue('color', c)
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      pickedColor === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <Input
                  placeholder="#FFB6C1"
                  className="w-28"
                  value={pickedColor}
                  onChange={(e) => {
                    setPickedColor(e.target.value)
                    setValue('color', e.target.value)
                  }}
                />
                {pickedColor && (
                  <button
                    type="button"
                    onClick={() => { setPickedColor(''); setValue('color', '') }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    清除
                  </button>
                )}
              </div>
              {errors.color && (
                <p className="text-xs text-red-500">{errors.color.message}</p>
              )}
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? '新增中...' : '新增標籤'}
            </Button>
          </form>
        </section>

        {/* 我的標籤 */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">我的標籤</h2>

          {isLoading && (
            <div className="flex gap-2 flex-wrap">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-16 bg-gray-100 rounded-full animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && myTags.length === 0 && (
            <p className="text-sm text-gray-400">還沒有標籤，使用上方表單新增</p>
          )}

          {myTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {myTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-1 group">
                  <span
                    className="px-3 py-1 rounded-full text-sm border"
                    style={
                      tag.color
                        ? { backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }
                        : { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' }
                    }
                  >
                    {tag.name}
                  </span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(tag.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      confirmId === tag.id
                        ? 'border-red-300 text-red-500 bg-red-50'
                        : 'border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {confirmId === tag.id ? '確認刪除' : '×'}
                  </button>
                  {confirmId === tag.id && (
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setConfirmId(null)}
                    >
                      取消
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 全域標籤（唯讀） */}
        {globalTags.length > 0 && (
          <section className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-1">平台標籤</h2>
            <p className="text-xs text-gray-400 mb-4">由平台提供，所有商城共用，不可刪除</p>
            <div className="flex flex-wrap gap-2">
              {globalTags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-500"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
