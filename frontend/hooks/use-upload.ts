'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

type PresignResponse = {
  success: boolean
  data: {
    uploadUrl: string
    objectUrl: string
    key: string
  }
}

type UploadState = {
  progress: number
  isUploading: boolean
  error: string | null
}

type UseUploadReturn = UploadState & {
  upload: (file: File) => Promise<string | null>
  reset: () => void
}

const INITIAL_STATE: UploadState = { progress: 0, isUploading: false, error: null }

export function useUpload(): UseUploadReturn {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setState({ progress: 0, isUploading: true, error: null })

    try {
      const { data: presignRes } = await api.post<PresignResponse>('/uploads/presign', {
        filename: file.name,
        contentType: file.type,
      })

      const { uploadUrl, objectUrl } = presignRes.data

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setState((prev) => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`上傳失敗：HTTP ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('網路錯誤，上傳失敗')))
        xhr.addEventListener('abort', () => reject(new Error('上傳已取消')))

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setState({ progress: 100, isUploading: false, error: null })
      return objectUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : '上傳失敗'
      setState({ progress: 0, isUploading: false, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { ...state, upload, reset }
}
