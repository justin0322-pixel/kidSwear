'use client'

import { create } from 'zustand'

export type AppNotification = {
  id: string
  type: 'new_order' | 'order_status_changed'
  orderId: string
  orderNumber: string
  message: string
  read: boolean
  createdAt: Date
}

type NotificationState = {
  notifications: AppNotification[]
  unreadCount: number
  add: (payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  add: (payload) =>
    set((state) => ({
      notifications: [
        { ...payload, id: crypto.randomUUID(), read: false, createdAt: new Date() },
        ...state.notifications,
      ].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}))
