'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTextSearch, useImageSearch, type SearchResultItem } from '@/hooks/use-search'
import { useProductFTSearch, type FTSProduct } from '@/hooks/use-products'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['', '上衣', '褲子', '裙子', '連身衣', '外套', '配件', '鞋子', '其他']

function AiProductCard({ item }: { item: SearchResultItem }) {
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
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">無圖片</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{item.shop.name}</p>
        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
        <p className="text-gray-700 mt-1 text-sm">NT${Number(item.base_price).toLocaleString('zh-TW')}</p>
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

function FTSProductCard({ item }: { item: FTSProduct }) {
  const headline = item.headline
    .replace(/<<(.+?)>>/g, '<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">$1</mark>')

  return (
    <Link
      href={`/products/${item.id}`}
      className="bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {item.primaryImageUrl ? (
          <img
            src={item.primaryImageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">無圖片</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{item.shop.name}</p>
        <p
          className="font-medium text-gray-900 text-sm leading-snug line-clamp-2"
          dangerouslySetInnerHTML={{ __html: headline }}
        />
        <p className="text-gray-700 mt-1 text-sm">NT${Number(item.basePrice).toLocaleString('zh-TW')}</p>
        <p className="mt-1 text-xs text-gray-400">{item.category}</p>
      </div>
    </Link>
  )
}

function SkeletonGrid() {
  return (
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
  )
}

export default function RetailerSearchPage() {
  const [textQuery, setTextQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<'fts' | 'ai-text' | 'ai-image'>('fts')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)

  // Debounce input → FTS
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(textQuery), 300)
    return () => clearTimeout(t)
  }, [textQuery])

  const { data: ftsData, isFetching: ftsFetching } = useProductFTSearch(debouncedQuery)

  const {
    mutate: searchText,
    data: aiTextResults,
    isPending: aiTextPending,
    isError: aiTextError,
  } = useTextSearch()

  const {
    mutate: searchImage,
    data: aiImageResults,
    isPending: aiImagePending,
    isError: aiImageError,
  } = useImageSearch()

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textQuery.trim()) return
    setActiveMode('ai-text')
    searchText({ query: textQuery.trim(), category: category || undefined })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    imageFileRef.current = file
    setPreviewUrl(URL.createObjectURL(file))
    setActiveMode('ai-image')
    searchImage({ file, category: category || undefined })
  }

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    if (activeMode === 'ai-text' && textQuery.trim()) {
      searchText({ query: textQuery.trim(), category: val || undefined })
    } else if (activeMode === 'ai-image' && imageFileRef.current) {
      searchImage({ file: imageFileRef.current, category: val || undefined })
    }
  }

  const showFts = activeMode === 'fts' && debouncedQuery.trim().length > 0
  const showAiText = activeMode === 'ai-text'
  const showAiImage = activeMode === 'ai-image'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="space-y-3">
          <form onSubmit={handleAiSearch} className="flex gap-2">
            <Input
              placeholder="輸入商品名稱即時搜尋，或按「AI 搜尋」做語意比對..."
              value={textQuery}
              onChange={(e) => {
                setTextQuery(e.target.value)
                if (activeMode !== 'fts') setActiveMode('fts')
              }}
              className="flex-1"
            />
            <Button type="submit" disabled={aiTextPending || !textQuery.trim()}>
              {aiTextPending ? '搜尋中...' : 'AI 搜尋'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={aiImagePending}
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

          {/* 模式標籤 */}
          {(showFts || showAiText || showAiImage) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {showFts && (
                <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  全文搜尋（PostgreSQL FTS）
                  {ftsFetching && ' · 搜尋中...'}
                </span>
              )}
              {showAiText && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  ✦ AI 語意搜尋
                </span>
              )}
              {showAiImage && (
                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  ✦ AI 以圖搜圖
                </span>
              )}
            </div>
          )}

          {/* 品類篩選 */}
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
          {previewUrl && showAiImage && (
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
                  setActiveMode('fts')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {/* FTS 結果 */}
        {showFts && (
          <>
            {ftsFetching && <SkeletonGrid />}
            {!ftsFetching && ftsData && ftsData.data.length === 0 && (
              <p className="text-center text-gray-400 py-16">找不到「{debouncedQuery}」相關商品</p>
            )}
            {!ftsFetching && ftsData && ftsData.data.length > 0 && (
              <>
                <p className="text-sm text-gray-500">
                  找到 {ftsData.pagination.total} 件商品
                  <span className="ml-2 text-xs text-gray-400">· 按「AI 搜尋」可做語意比對</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {ftsData.data.map((item) => (
                    <FTSProductCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* AI 文字搜尋結果 */}
        {showAiText && (
          <>
            {aiTextPending && <SkeletonGrid />}
            {aiTextError && <p className="text-center text-red-500 py-12">AI 搜尋失敗，請確認推薦服務是否啟動</p>}
            {!aiTextPending && aiTextResults && aiTextResults.items.length === 0 && (
              <p className="text-center text-gray-400 py-16">找不到相似商品，試試其他描述</p>
            )}
            {!aiTextPending && aiTextResults && aiTextResults.items.length > 0 && (
              <>
                <p className="text-sm text-gray-500">找到 {aiTextResults.total} 件相關商品</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {aiTextResults.items.map((item) => (
                    <AiProductCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* AI 圖片搜尋結果 */}
        {showAiImage && (
          <>
            {aiImagePending && <SkeletonGrid />}
            {aiImageError && <p className="text-center text-red-500 py-12">搜尋失敗，請確認推薦服務是否啟動</p>}
            {!aiImagePending && aiImageResults && aiImageResults.items.length === 0 && (
              <p className="text-center text-gray-400 py-16">找不到視覺相似的商品</p>
            )}
            {!aiImagePending && aiImageResults && aiImageResults.items.length > 0 && (
              <>
                <p className="text-sm text-gray-500">找到 {aiImageResults.total} 件相似商品</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {aiImageResults.items.map((item) => (
                    <AiProductCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* 初始狀態 */}
        {!showFts && !showAiText && !showAiImage && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">輸入商品名稱即時搜尋</p>
            <p className="text-sm mt-1">或按「AI 搜尋」進行語意比對 · 以圖搜圖</p>
          </div>
        )}
      </main>
    </div>
  )
}
