'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => {
            if (!open) removeToast(t.id)
          }}
          duration={5000}
          className={[
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
            'bg-white text-gray-900',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-8',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-8',
            t.variant === 'destructive' ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-200',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex-1 min-w-0">
            <ToastPrimitive.Title className="text-sm font-medium">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="mt-0.5 text-xs text-gray-500">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close
            className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-700"
            aria-label="關閉"
          >
            <X size={14} />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80" />
    </ToastPrimitive.Provider>
  )
}
