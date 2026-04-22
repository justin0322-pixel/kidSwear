'use client'

import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'destructive'

export type Toast = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastStore = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export function toast(options: Omit<Toast, 'id'>): void {
  useToastStore.getState().addToast(options)
}
