export const ORDER_CREATED = 'order.created';
export const ORDER_STATUS_CHANGED = 'order.status_changed';
export const STOCK_LOW = 'stock.low';

export class StockLowEvent {
  constructor(
    public readonly variantId: string,
    public readonly productName: string,
    public readonly sku: string,
    public readonly availableStock: number,
    public readonly threshold: number,
    public readonly wholesalerUserId: string,
    public readonly wholesalerEmail: string,
  ) {}
}

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly wholesalerUserId: string,
    public readonly retailerShopName: string,
    public readonly wholesalerEmail: string,
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly retailerUserId: string,
    public readonly retailerEmail: string,
    public readonly newStatus: string,
    public readonly wholesalerLineToken: string | null,
  ) {}
}
