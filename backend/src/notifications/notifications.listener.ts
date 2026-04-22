import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import {
  ORDER_CREATED,
  ORDER_STATUS_CHANGED,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '../orders/events/order.events'
import { NotificationsService } from './notifications.service'
import { EmailService } from './email.service'
import { LineNotifyService } from './line-notify.service'

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly lineNotify: LineNotifyService,
  ) {}

  @OnEvent(ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // 1. WebSocket push to wholesaler
    this.notifications.notifyNewOrder(
      event.wholesalerUserId,
      event.orderId,
      event.orderNumber,
      event.retailerShopName,
    )

    // 2. Email to wholesaler
    if (event.wholesalerEmail) {
      await this.email.sendNewOrderNotification(
        event.wholesalerEmail,
        event.orderNumber,
        event.retailerShopName,
      )
    }

    // 3. LINE Notify to wholesaler (if token exists)
    const lineToken = await this.lineNotify.getTokenByUserId(BigInt(event.wholesalerUserId))
    if (lineToken) {
      await this.lineNotify.push(
        lineToken,
        `\n新訂單 ${event.orderNumber}\n來自：${event.retailerShopName}`,
      )
    }
  }

  @OnEvent(ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    // 1. WebSocket push to retailer
    this.notifications.notifyOrderStatusChanged(
      event.retailerUserId,
      event.orderId,
      event.orderNumber,
      event.newStatus,
    )

    // 2. Email to retailer
    if (event.retailerEmail) {
      await this.email.sendOrderStatusNotification(
        event.retailerEmail,
        event.orderNumber,
        event.newStatus,
      )
    }
  }
}
