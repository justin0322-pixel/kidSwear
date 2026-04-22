export const ORDER_CREATED = 'order.created'
export const ORDER_STATUS_CHANGED = 'order.status_changed'

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
