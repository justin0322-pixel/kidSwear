import { Injectable } from '@nestjs/common'
import { NotificationsGateway } from './notifications.gateway'

export type NotificationPayload = {
  type: 'new_order' | 'order_status_changed'
  orderId: string
  orderNumber: string
  message: string
  data?: Record<string, unknown>
}

@Injectable()
export class NotificationsService {
  constructor(private readonly gateway: NotificationsGateway) {}

  notifyUser(userId: string, payload: NotificationPayload): void {
    this.gateway.emitToUser(userId, 'notification', payload)
  }

  notifyNewOrder(wholesalerUserId: string, orderId: string, orderNumber: string, retailerName: string): void {
    this.notifyUser(wholesalerUserId, {
      type: 'new_order',
      orderId,
      orderNumber,
      message: `${retailerName} 下了新訂單 ${orderNumber}`,
    })
  }

  notifyOrderStatusChanged(retailerUserId: string, orderId: string, orderNumber: string, status: string): void {
    const STATUS_MSG: Record<string, string> = {
      paid: '已確認付款',
      processing: '備貨中',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消',
    }
    this.notifyUser(retailerUserId, {
      type: 'order_status_changed',
      orderId,
      orderNumber,
      message: `訂單 ${orderNumber} ${STATUS_MSG[status] ?? status}`,
      data: { status },
    })
  }
}
