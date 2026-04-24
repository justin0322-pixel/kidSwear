'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProduct, useUpdateProduct, useShopTags, useAddVariant, useUpdateVariant, useRemoveVariant, type ProductVariant } from '@/hooks/use-products'
import { useMyShop } from '@/hooks/use-shop'
import { ImageUploader } from '@/components/wholesaler/ImageUploader'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, '請填寫商品名稱'),
  description: z.string().min(1, '請填寫商品描述'),
  category: z.string().min(1, '請選擇品類'),
  ageRange: z.string().min(1, '請選擇年齡範圍'),
  gender: z.string().min(1, '請選擇性別'),
  basePrice: z.string().min(1, '請填寫批發價').regex(/^\d+(\.\d{1,2})?$/, '請輸入有效金額'),
  suggestedRetailPrice: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, '請輸入有效金額')
    .optional(),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = ['上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']
const AGE_RANGES = ['0-3M', '3-6M', '6-12M', '1-2Y', '2-3Y', '3-5Y', '5-7Y', '7-10Y', '10-12Y']
const GENDERS = [
  { value: 'male', label: '男童' },
  { value: 'female', label: '女童' },
  { value: 'unisex', label: '不限' },
]

// ─── Variant Manager ─────────────────────────────────────────────────────────

type VariantRowProps = { variant: ProductVariant; productId: number }

function VariantRow({ variant, productId }: VariantRowProps) {
  const [stock, setStock] = useState(String(variant.stock))
  const [price, setPrice] = useState(variant.price)
  const [confirmDel, setConfirmDel] = useState(false)
  const [dirty, setDirty] = useState(false)

  const { mutate: updateVariant, isPending: saving } = useUpdateVariant(productId)
  const { mutate: removeVariant, isPending: deleting } = useRemoveVariant(productId)

  const handleSave = () => {
    updateVariant(
      { variantId: Number(variant.id), stock: Number(stock), price: price || undefined },
      { onSuccess: () => setDirty(false) },
    )
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-3 text-sm text-gray-700">{variant.size}</td>
      <td className="py-2.5 pr-3 text-sm text-gray-700">{variant.color}</td>
      <td className="py-2.5 pr-3">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => { setStock(e.target.value); setDirty(true) }}
          className="w-20 rounded border border-input px-2 py-1 text-sm text-center tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </td>
      <td className="py-2.5 pr-3">
        <input
          type="text"
          placeholder="同批發價"
          value={price}
          onChange={(e) => { setPrice(e.target.value); setDirty(true) }}
          className="w-24 rounded border border-input px-2 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          {dirty && (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              {saving ? '…' : '儲存'}
            </Button>
          )}
          {confirmDel ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting}
                className="border-red-400 text-red-500 hover:bg-red-50"
                onClick={() => removeVariant(Number(variant.id))}
              >
                確認刪除
              </Button>
              <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setConfirmDel(false)}>取消</button>
            </>
          ) : (
            <button type="button" className="text-xs text-gray-400 hover:text-red-400" onClick={() => setConfirmDel(true)}>刪除</button>
          )}
        </div>
      </td>
    </tr>
  )
}

type AddVariantFormProps = { productId: number; onDone: () => void }

function AddVariantForm({ productId, onDone }: AddVariantFormProps) {
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [stock, setStock] = useState('0')
  const [price, setPrice] = useState('')
  const { mutate: addVariant, isPending, error } = useAddVariant(productId)

  const handleAdd = () => {
    if (!size.trim() || !color.trim()) return
    addVariant(
      { size: size.trim(), color: color.trim(), stock: Number(stock), price: price || undefined },
      { onSuccess: () => { setSize(''); setColor(''); setStock('0'); setPrice(''); onDone() } },
    )
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">新增規格</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">尺寸 *</label>
          <Input placeholder="e.g. 90cm" value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">顏色 *</label>
          <Input placeholder="e.g. 白色" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">庫存</label>
          <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">單獨訂價</label>
          <Input placeholder="選填" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-500">
          {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? '新增失敗'}
        </p>
      )}
      <Button size="sm" disabled={isPending || !size.trim() || !color.trim()} onClick={handleAdd}>
        {isPending ? '新增中...' : '+ 新增規格'}
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = Number(params.id)

  const { data: product, isLoading } = useProduct(productId)
  const { data: myShop } = useMyShop()
  const { data: tags } = useShopTags(myShop?.id)
  const { mutate: updateProduct, isPending, error } = useUpdateProduct(productId)

  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [tagsInitialized, setTagsInitialized] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        category: product.category,
        ageRange: product.ageRange ?? '',
        gender: product.gender ?? '',
        basePrice: product.basePrice,
        suggestedRetailPrice: product.suggestedRetailPrice ?? '',
      })
      const primary = product.images.find((img) => img.isPrimary) ?? product.images[0]
      if (primary) setImageUrl(primary.url)
    }
  }, [product, reset])

  useEffect(() => {
    if (product && tags && !tagsInitialized) {
      const matched = tags
        .filter((t) => product.tags.includes(t.name))
        .map((t) => t.id)
      setSelectedTags(matched)
      setTagsInitialized(true)
    }
  }, [product, tags, tagsInitialized])

  const toggleTag = (id: number) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  const onSubmit = (values: FormValues) => {
    updateProduct(
      {
        ...values,
        tags: selectedTags,
        suggestedRetailPrice: values.suggestedRetailPrice || undefined,
        imageUrls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
      },
      {
        onSuccess: () => router.push('/wholesaler/products'),
      },
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">編輯商品</h1>
      </div>

      <main className="p-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {product && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">基本資料</h2>

              <div className="space-y-1">
                <Label htmlFor="name">商品名稱 *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">商品描述 *</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="category">品類 *</Label>
                  <select
                    id="category"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('category')}
                  >
                    <option value="">請選擇</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-xs text-red-500">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="gender">性別 *</Label>
                  <select
                    id="gender"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('gender')}
                  >
                    <option value="">請選擇</option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                  {errors.gender && (
                    <p className="text-xs text-red-500">{errors.gender.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ageRange">年齡範圍 *</Label>
                <select
                  id="ageRange"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('ageRange')}
                >
                  <option value="">請選擇</option>
                  {AGE_RANGES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {errors.ageRange && (
                  <p className="text-xs text-red-500">{errors.ageRange.message}</p>
                )}
              </div>
            </section>

            {/* 定價 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">定價</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="basePrice">批發價（NT$）*</Label>
                  <Input id="basePrice" {...register('basePrice')} />
                  {errors.basePrice && (
                    <p className="text-xs text-red-500">{errors.basePrice.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suggestedRetailPrice">建議售價（NT$）</Label>
                  <Input
                    id="suggestedRetailPrice"
                    placeholder="選填"
                    {...register('suggestedRetailPrice')}
                  />
                </div>
              </div>
            </section>

            {/* 商品圖片 */}
            <section className="bg-white rounded-lg border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">商品主圖</h2>
                <span className="text-xs text-gray-400">上傳新圖片將取代現有主圖</span>
              </div>
              {imageUrl && (
                <div className="flex items-start gap-3">
                  <img
                    src={imageUrl}
                    alt="商品主圖"
                    className="h-24 w-24 object-cover rounded-lg border bg-gray-50"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 text-xs text-gray-400 break-all pt-1">{imageUrl}</div>
                </div>
              )}
              <ImageUploader
                onUploaded={(url) => setImageUrl(url)}
              />
              <p className="text-xs text-gray-400">上傳後系統將重新計算 AI 向量索引</p>
            </section>

            {/* 規格與庫存 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">規格與庫存</h2>

              {product.variants && product.variants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-400">
                        <th className="pb-2 pr-3 font-medium">尺寸</th>
                        <th className="pb-2 pr-3 font-medium">顏色</th>
                        <th className="pb-2 pr-3 font-medium">庫存</th>
                        <th className="pb-2 pr-3 font-medium">訂價（NT$）</th>
                        <th className="pb-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <VariantRow key={v.id} variant={v} productId={productId} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">尚無任何規格，請新增。</p>
              )}

              <AddVariantForm productId={productId} onDone={() => {}} />
            </section>

            {/* 標籤 */}
            {tags && tags.length > 0 && (
              <section className="bg-white rounded-lg border p-6 space-y-3">
                <h2 className="font-semibold text-gray-900">標籤</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                      style={
                        tag.color && !selectedTags.includes(tag.id)
                          ? { borderColor: tag.color + '66', color: tag.color }
                          : undefined
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">
                {(error as { response?: { data?: { error?: { message?: string } } } })?.response
                  ?.data?.error?.message ?? '更新失敗，請稍後再試'}
              </p>
            )}

            <div className="flex gap-3 pb-8">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/wholesaler/products')}
              >
                取消
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? '儲存中...' : '儲存變更'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
