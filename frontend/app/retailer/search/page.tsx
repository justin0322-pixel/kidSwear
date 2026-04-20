'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useTextSearch, useImageSearch, type SearchResultItem } from '@/hooks/use-search'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['', '上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']

function ProductCard({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={`/products/${item.id}`}
      className="bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {item.primary_image_url ? (
          <img
            src={item.primary_image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            無圖片
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{item.shop.name}</p>
        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
        <p className="text-gray-700 mt-1 text-sm">
          NT${Number(item.base_price).toLocaleString('zh-TW')}
        </p>
        <div className="mt-1.5 flex items-center gap-1">
          <div
            className="h-1.5 rounded-full bg-blue-400"
            style={{ width: `${Math.round(item.score * 100)}%`, maxWidth: '100%' }}
          />
          <span className="text-xs text-gray-400">{Math.round(item.score * 100)}% 相似</span>
        </div>
      </div>
    </Link>
  )
}

export default function RetailerSearchPage() {
  const [textQuery, setTextQuery] = useState('')
  const [category, setCategory] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<'text' | 'image'>('text')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)

  const {
    mutate: searchText,
    data: textResults,
    isPending: textPending,
    isError: textError,
  } = useTextSearch()

  const {
    mutate: searchImage,
    data: imageResults,
    isPending: imagePending,
    isError: imageError,
  } = useImageSearch()

  const results = activeMode === 'text' ? textResults : imageResults
  const isPending = textPending || imagePending
  const isError = textError || imageError

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textQuery.trim()) return
    setActiveMode('text')
    searchText({ query: textQuery.trim(), category: category || undefined })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    imageFileRef.current = file
    setPreviewUrl(URL.createObjectURL(file))
    setActiveMode('image')
    searchImage({ file, category: category || undefined })
  }

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    if (activeMode === 'text' && textQuery.trim()) {
      searchText({ query: textQuery.trim(), category: val || undefined })
    } else if (activeMode === 'image' && imageFileRef.current) {
      searchImage({ file: imageFileRef.current, category: val || undefined })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="space-y-3">
          {/* 文字搜尋 */}
          <form onSubmit={handleTextSearch} className="flex gap-2">
            <Input
              placeholder="描述你想找的商品，例如：藍色卡通動物上衣..."
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isPending || !textQuery.trim()}>
              {textPending ? '搜尋中...' : '搜尋'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              title="以圖搜圖"
            >
              以圖搜圖
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />
          </form>

          {/* 篩選列 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">品類：</span>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCategoryChange(c)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  category === c
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {c || '全部'}
              </button>
            ))}
          </div>

          {/* 圖片預覽 */}
          {previewUrl && activeMode === 'image' && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <img src={previewUrl} alt="搜尋圖片" className="w-16 h-16 object-cover rounded" />
              <div>
                <p className="text-sm font-medium text-gray-900">以圖搜圖</p>
                <p className="text-xs text-gray-400">正在尋找視覺相似的商品</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null)
                  imageFileRef.current = null
                  setActiveMode('text')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {/* 結果 */}
        {isPending && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border overflow-hidden">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">搜尋失敗，請確認推薦服務是否啟動</p>
        )}

        {!isPending && results && results.items.length === 0 && (
          <p className="text-center text-gray-400 py-16">找不到符合的商品，試試其他關鍵字</p>
        )}

        {!isPending && results && results.items.length > 0 && (
          <>
            <p className="text-sm text-gray-500">找到 {results.total} 件相關商品</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.items.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}

        {!isPending && !results && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">輸入描述或上傳圖片開始搜尋</p>
            <p className="text-sm mt-1">支援語意搜尋與視覺相似搜尋</p>
          </div>
        )}
      </main>
    </div>
  )
}
