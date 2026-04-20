'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SearchResultItem = {
  id: string
  name: string
  category: string
  base_price: string
  primary_image_url: string | null
  shop: { id: string; name: string }
  score: number
  reason: string | null
}

export type SearchResponse = {
  items: SearchResultItem[]
  total: number
}

export function useTextSearch() {
  return useMutation({
    mutationFn: async (params: { query: string; limit?: number; category?: string }) => {
      const res = await api.post<{ data: SearchResponse }>('/recommendations/search/text', params)
      return res.data.data
    },
  })
}

export function useImageSearch() {
  return useMutation({
    mutationFn: async (params: { file: File; limit?: number; category?: string }) => {
      const form = new FormData()
      form.append('file', params.file)
      const searchParams = new URLSearchParams({ limit: String(params.limit ?? 12) })
      if (params.category) searchParams.set('category', params.category)
      const res = await api.post<{ data: SearchResponse }>(
        `/recommendations/search/image?${searchParams}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
  })
}
