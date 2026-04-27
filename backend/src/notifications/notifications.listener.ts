import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ORDER_CREATED,
  ORDER_STATUS_CHANGED,
  STOCK_LOW,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  StockLowEvent,
} from '../orders/events/order.events';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { LineNotifyService } from './line-notify.service';

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
    );

    // 2. Email to wholesaler
    if (event.wholesalerEmail) {
      await this.email.sendNewOrderNotification(
        event.wholesalerEmail,
        event.orderNumber,
        event.retailerShopName,
        event.total,
        event.itemCount,
      );
    }

    // 3. LINE Notify to wholesaler (if token exists)
    const lineToken = await this.lineNotify.getTokenByUserId(BigInt(event.wholesalerUserId));
    if (lineToken) {
      await this.lineNotify.push(
        lineToken,
        `\n新訂單 ${event.orderNumber}\n來自：${event.retailerShopName}`,
      );
    }
  }

  @OnEvent(STOCK_LOW)
  async handleStockLow(event: StockLowEvent): Promise<void> {
    const message = `庫存預警：${event.productName}（${event.sku}）剩餘 ${event.availableStock} 件，低於閾值 ${event.threshold}`;

    // WebSocket push to wholesaler
    if (event.wholesalerUserId) {
      this.notifications.notifyUser(event.wholesalerUserId, {
        type: 'new_order',
        orderId: '',
        orderNumber: '',
        message,
        data: {
          variantId: event.variantId,
          availableStock: event.availableStock,
          threshold: event.threshold,
        },
      });
    }

    // Email to wholesaler
    if (event.wholesalerEmail) {
      await this.email.send({
        to: event.wholesalerEmail,
        subject: `[童裝平台] 庫存預警：${event.productName}`,
        html: `
          <h2>⚠️ 庫存預警通知</h2>
          <p><strong>商品：</strong>${event.productName}</p>
          <p><strong>SKU：</strong>${event.sku}</p>
          <p><strong>可用庫存：</strong>${event.availableStock} 件</p>
          <p><strong>預警閾值：</strong>${event.threshold} 件</p>
          <p>請盡快補充庫存，避免影響訂單處理。</p>
        `,
      });
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
    );

    // 2. Email to retailer
    if (event.retailerEmail) {
      await this.email.sendOrderStatusNotification(
        event.retailerEmail,
        event.orderNumber,
        event.newStatus,
      );
    }
  }
}
