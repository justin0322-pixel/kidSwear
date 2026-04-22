'use client'

import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateProduct, useShopTags } from '@/hooks/use-products'
import { useMyShop } from '@/hooks/use-shop'
import { useSuggestTags } from '@/hooks/use-tag-suggest'
import { Navbar } from '@/components/layout/Navbar'
import { VariantEditor } from '@/components/wholesaler/VariantEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRef, useState } from 'react'

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
  variants: z
    .array(
      z.object({
        size: z.string().min(1, '請填寫尺寸'),
        color: z.string().min(1, '請填寫顏色'),
        stock: z.number().min(0, '庫存不能為負數'),
        price: z.string().optional(),
      }),
    )
    .min(1, '至少要新增一個變體'),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = ['上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']
const AGE_RANGES = ['0-3M', '3-6M', '6-12M', '1-2Y', '2-3Y', '3-5Y', '5-7Y', '7-10Y', '10-12Y']
const GENDERS = [
  { value: 'male', label: '男童' },
  { value: 'female', label: '女童' },
  { value: 'unisex', label: '不限' },
]

export default function NewProductPage() {
  const router = useRouter()
  const { data: myShop } = useMyShop()
  const { mutate: createProduct, isPending, error } = useCreateProduct()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: suggestTags, isPending: isSuggesting, data: suggestedTags } = useSuggestTags()

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      ageRange: '',
      gender: '',
      basePrice: '',
      suggestedRetailPrice: '',
      variants: [],
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods

  const { data: tags } = useShopTags(myShop?.id)

  const toggleTag = (id: number) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    suggestTags(file)
  }

  const applyAllSuggested = () => {
    if (!suggestedTags || !tags) return
    const shopTagIds = new Set(tags.map((t) => String(t.id)))
    const matchingIds = suggestedTags
      .filter((s) => shopTagIds.has(s.id))
      .map((s) => Number(s.id))
    setSelectedTags((prev) => Array.from(new Set([...prev, ...matchingIds])))
  }

  const onSubmit = (values: FormValues) => {
    createProduct(
      {
        ...values,
        tags: selectedTags,
        attributes: {},
        variants: values.variants.map((v) => ({
          ...v,
          price: v.price || undefined,
        })),
        imageUrls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
      },
      {
        onSuccess: () => {
          router.push(`/wholesaler/products`)
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b px-6 py-3 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900">新增商品</h1>
      </div>

      <main className="p-6 max-w-2xl mx-auto">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">基本資料</h2>

              <div className="space-y-1">
                <Label htmlFor="name">商品名稱 *</Label>
                <Input id="name" placeholder="例：可愛小熊上衣" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">商品描述 *</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="描述商品特色、材質、適合場合..."
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

            {/* 價格 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">定價</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="basePrice">批發價（NT$）*</Label>
                  <Input id="basePrice" placeholder="250" {...register('basePrice')} />
                  {errors.basePrice && (
                    <p className="text-xs text-red-500">{errors.basePrice.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suggestedRetailPrice">建議售價（NT$）</Label>
                  <Input
                    id="suggestedRetailPrice"
                    placeholder="499（選填）"
                    {...register('suggestedRetailPrice')}
                  />
                </div>
              </div>
            </section>

            {/* AI 標籤建議 */}
            <section className="bg-white rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">AI 標籤建議</h2>
                <span className="text-xs text-gray-400">上傳商品圖片，AI 自動推薦標籤</span>
              </div>

              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="預覽" className="mx-auto h-32 object-contain rounded" />
                ) : (
                  <div className="space-y-1 py-4">
                    <p className="text-sm text-gray-500">點擊上傳商品圖片</p>
                    <p className="text-xs text-gray-400">支援 JPG、PNG，最大 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {isSuggesting && (
                <p className="text-xs text-gray-500 animate-pulse">AI 分析中，請稍候...</p>
              )}

              {suggestedTags && suggestedTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">建議標籤（依相似度排序）</p>
                    <button
                      type="button"
                      onClick={applyAllSuggested}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      全部套用
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => {
                      const shopTag = tags?.find((t) => String(t.id) === tag.id)
                      if (!shopTag) return null
                      const isSelected = selectedTags.includes(shopTag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(shopTag.id)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            isSelected
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                          style={
                            tag.color && !isSelected
                              ? { borderColor: tag.color + '66', color: tag.color }
                              : undefined
                          }
                        >
                          {tag.name}
                          <span className="ml-1 opacity-50 text-xs">×{tag.freq}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 商品圖片 URL */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="imageUrl">商品主圖連結（URL）</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://cdn.example.com/product.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-xs text-gray-400">填入後系統將自動計算 AI 向量，讓此商品出現在搜尋結果中</p>
              </div>
            </section>

            {/* 標籤 */}
            {tags && tags.length > 0 && (
              <section className="bg-white rounded-lg border p-6 space-y-3">
                <h2 className="font-semibold text-gray-900">全部標籤</h2>
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

            {/* 變體 */}
            <section className="bg-white rounded-lg border p-6">
              <VariantEditor />
              {errors.variants && typeof errors.variants.message === 'string' && (
                <p className="text-xs text-red-500 mt-2">{errors.variants.message}</p>
              )}
            </section>

            {/* 錯誤提示 */}
            {error && (
              <p className="text-sm text-red-500 text-center">
                {(error as { response?: { data?: { error?: { message?: string } } } })?.response
                  ?.data?.error?.message ?? '建立失敗，請稍後再試'}
              </p>
            )}

            {/* 送出 */}
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
                {isPending ? '建立中...' : '建立商品'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </main>
    </div>
  )
}
