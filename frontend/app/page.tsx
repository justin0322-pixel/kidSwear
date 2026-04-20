import Link from 'next/link'
import { Suspense } from 'react'
import ShopsPreview from '@/components/home/ShopsPreview'
import { Navbar } from '@/components/layout/Navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            B2B 童裝批發
            <br />
            <span className="text-gray-500">訂單管理平台</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto">
            連結童裝批發商與零售商，整合 AI 推薦系統，讓進貨更聰明、管理更輕鬆。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-gray-700 transition-colors"
            >
              立即開始
            </Link>
            <Link
              href="/shops"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-base font-medium hover:border-gray-500 transition-colors"
            >
              瀏覽商城
            </Link>
          </div>
        </div>
      </section>

      {/* 特色說明 */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">平台特色</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🤖',
              title: 'AI 推薦系統',
              desc: '三層 AI 引擎（SVD 協同過濾 + CLIP 視覺搜尋 + LLM 推薦理由），精準推薦適合商品。',
            },
            {
              icon: '📦',
              title: '完整訂單管理',
              desc: '從下單、付款、備貨到出貨，清晰的狀態追蹤，批發商與零售商即時同步。',
            },
            {
              icon: '🔍',
              title: '以圖搜圖',
              desc: '上傳任一張童裝圖片，即可找到視覺相似的商品，快速找到你要的款式。',
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-6 space-y-3">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 熱門商城 */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">熱門商城</h2>
            <Link
              href="/shops"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              查看全部 →
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-44 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            }
          >
            <ShopsPreview />
          </Suspense>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">準備好了嗎？</h2>
          <p className="text-gray-500">加入我們，批發商上架商品、零售商智慧進貨，全程線上管理。</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/register?role=wholesaler"
              className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              我是批發商，免費開店
            </Link>
            <Link
              href="/register?role=retailer"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium hover:border-gray-500 transition-colors"
            >
              我是零售商，開始採購
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-sm text-gray-400">
        <p>© 2026 童裝批發平台. All rights reserved.</p>
      </footer>
    </div>
  )
}
