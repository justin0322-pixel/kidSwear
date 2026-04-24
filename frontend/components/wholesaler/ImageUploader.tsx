'use client'

import { useRef, useState, useCallback } from 'react'
import { useUpload } from '@/hooks/use-upload'

type Props = {
  onUploaded: (objectUrl: string) => void
  onFileSelected?: (file: File) => void
  accept?: string
}

export function ImageUploader({ onUploaded, onFileSelected, accept = 'image/jpeg,image/png,image/webp,image/gif' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { progress, isUploading, error, upload, reset } = useUpload()

  const processFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file))
    onFileSelected?.(file)
    const objectUrl = await upload(file)
    if (objectUrl) onUploaded(objectUrl)
  }, [upload, onUploaded, onFileSelected])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const handleRemove = () => {
    setPreview(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : isUploading
              ? 'border-blue-300 bg-blue-50/50'
              : 'border-gray-200 hover:border-gray-400'
        }`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative p-2">
            <img
              src={preview}
              alt="商品預覽"
              className="mx-auto h-40 object-contain rounded"
            />
            {!isUploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                className="absolute top-1 right-1 bg-gray-900/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-gray-900"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-1">
            <div className="text-3xl text-gray-300">📷</div>
            <p className="text-sm text-gray-500">點擊或拖曳圖片至此</p>
            <p className="text-xs text-gray-400">支援 JPG、PNG、WebP、GIF，最大 5MB</p>
          </div>
        )}

        {/* 上傳進度條 */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-blue-600 animate-pulse">
          上傳中 {progress}%…
        </p>
      )}

      {progress === 100 && !isUploading && !error && (
        <p className="text-xs text-green-600">✓ 圖片上傳成功</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
