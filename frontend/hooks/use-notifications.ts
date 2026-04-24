'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { toast } from '@/stores/toast-store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000'

type NotificationPayload = {
  type: 'new_order' | 'order_status_changed'
  orderId: string
  orderNumber: string
  message: string
  data?: Record<string, unknown>
}

export function useNotifications(): void {
  const accessToken = useAuthStore((s) => s.accessToken)
  const addNotification = useNotificationStore((s) => s.add)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 5,
    })

    socket.on('notification', (payload: NotificationPayload) => {
      addNotification({
        type: payload.type,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        message: payload.message,
      })
      toast({ title: payload.message })
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, addNotification])
}
