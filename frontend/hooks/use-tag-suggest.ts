'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SuggestedTag = {
  id: string
  name: string
  color: string | null
  freq: number
}

async function suggestTagsFromFile(file: File): Promise<SuggestedTag[]> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<{ data: { tags: SuggestedTag[] } }>(
    '/recommendations/tags/suggest',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data.tags
}

export function useSuggestTags() {
  return useMutation({ mutationFn: suggestTagsFromFile })
}
