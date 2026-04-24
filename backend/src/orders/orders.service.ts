import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { OrderStatus, Prisma, UserRole } from '@prisma/client'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import {
  ORDER_CREATED,
  ORDER_STATUS_CHANGED,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from './events/order.events'
import { InventoryService } from '../inventory/inventory.service'

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.pending]: [OrderStatus.paid, OrderStatus.cancelled],
  [OrderStatus.paid]: [OrderStatus.processing, OrderStatus.refunded],
  [OrderStatus.processing]: [OrderStatus.shipped],
  [OrderStatus.shipped]: [OrderStatus.completed],
}

function orderDatePrefix(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

const ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  createdAt: true,
  shippingAddress: true,
  contactName: true,
  contactPhone: true,
  retailerNote: true,
  wholesalerNote: true,
  paidAt: true,
  shippedAt: true,
  completedAt: true,
  cancelledAt: true,
  shop: { select: { id: true, name: true } },
  retailer: { select: { id: true, shopName: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect

type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_LIST_SELECT }>

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventory: InventoryService,
  ) {}

  async create(userId: bigint, dto: CreateOrderDto) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    })
    if (!retailer) throw new ForbiddenException()

    const shop = await this.prisma.shop.findFirst({
      where: { id: BigInt(dto.shopId), isActive: true, deletedAt: null },
      include: { wholesaler: { include: { user: { select: { id: true, email: true } } } } },
    })
    if (!shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城不存在' })

    const variantIds = dto.items.map((i) => BigInt(i.variantId))
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true, basePrice: true, shopId: true } } },
    })

    if (variants.length !== dto.items.length) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '部分商品規格不存在' })
    }

    const variantMap = new Map(variants.map((v) => [v.id.toString(), v]))

    for (const item of dto.items) {
      const v = variantMap.get(item.variantId.toString())!
      if (v.product.shopId !== shop.id) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '商品不屬於此商城' })
      }
      const available = v.stock - v.reservedStock
      if (available < item.quantity) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: `${v.product.name} (${v.size}/${v.color}) 庫存不足，可用：${available}`,
        })
      }
    }

    let subtotal = new Prisma.Decimal(0)
    const itemsData = dto.items.map((item) => {
      const v = variantMap.get(item.variantId.toString())!
      const unitPrice = v.priceOverride ?? v.product.basePrice
      const itemSubtotal = unitPrice.mul(item.quantity)
      subtotal = subtotal.add(itemSubtotal)
      return {
        variantId: v.id,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      }
    })

    if (subtotal.lessThan(shop.minOrderAmount)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `訂單金額未達最低門檻 ${shop.minOrderAmount.toString()} 元`,
      })
    }

    const orderId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: `TEMP-${Date.now()}`,
          retailerId: retailer.id,
          shopId: shop.id,
          subtotal,
          total: subtotal,
          shippingAddress: dto.shippingAddress,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          retailerNote: dto.retailerNote,
          items: { createMany: { data: itemsData } },
        },
      })

      const orderNumber = `ORD-${orderDatePrefix()}-${order.id.toString().padStart(4, '0')}`
      await tx.order.update({ where: { id: order.id }, data: { orderNumber } })

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.pending,
          changedBy: userId,
        },
      })

      await Promise.all(
        dto.items.map((item) =>
          tx.productVariant.update({
            where: { id: BigInt(item.variantId) },
            data: { reservedStock: { increment: item.quantity } },
          }),
        ),
      )

      return order.id
    })

    const result = await this.findById(userId, UserRole.retailer, orderId)

    if (shop.wholesaler) {
      this.eventEmitter.emit(
        ORDER_CREATED,
        new OrderCreatedEvent(
          result.id,
          result.orderNumber,
          shop.wholesaler.userId.toString(),
          retailer.shopName,
          shop.wholesaler.user.email ?? '',
        ),
      )
    }

    // Check stock after reservedStock incremented
    void this.inventory.checkVariants(dto.items.map((i) => BigInt(i.variantId)))

    return result
  }

  async findAll(
    userId: bigint,
    role: UserRole,
    status?: string,
    page = 1,
    pageSize = 20,
    search?: string,
  ) {
    const skip = (page - 1) * pageSize
    const statusFilter = status ? ({ status: status as OrderStatus } as Prisma.OrderWhereInput) : {}

    let roleFilter: Prisma.OrderWhereInput = {}
    if (role === UserRole.retailer) {
      const retailer = await this.prisma.retailer.findUnique({ where: { userId } })
      if (!retailer) throw new ForbiddenException()
      roleFilter = { retailerId: retailer.id }
    } else if (role === UserRole.wholesaler) {
      const wholesaler = await this.prisma.wholesaler.findUnique({
        where: { userId },
        include: { shop: true },
      })
      if (!wholesaler?.shop) throw new ForbiddenException()
      roleFilter = { shopId: wholesaler.shop.id }
    }

    const searchFilter: Prisma.OrderWhereInput = search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { retailer: { shopName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}

    const where: Prisma.OrderWhereInput = { ...roleFilter, ...statusFilter, ...searchFilter }
    const [raw, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        select: ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ])

    return { items: raw.map((o) => this.formatList(o)), total, page, pageSize }
  }

  async findById(userId: bigint, role: UserRole, orderId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedByUser: { select: { email: true, role: true } } },
        },
        shop: { select: { id: true, name: true } },
        retailer: { select: { id: true, shopName: true, userId: true } },
      },
    })
    if (!order) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '訂單不存在' })

    await this.verifyAccess(userId, role, order)

    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      discount: order.discount.toString(),
      total: order.total.toString(),
      shippingAddress: order.shippingAddress,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      retailerNote: order.retailerNote,
      wholesalerNote: order.wholesalerNote,
      trackingNumber: order.trackingNumber,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      shop: { id: order.shop.id.toString(), name: order.shop.name },
      retailer: { id: order.retailer.id.toString(), shopName: order.retailer.shopName },
      items: order.items.map((item) => ({
        id: item.id.toString(),
        productName: item.productName,
        sku: item.sku,
        size: item.size,
        color: item.color,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
      })),
      statusHistory: order.statusHistory.map((h) => ({
        id: h.id.toString(),
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        createdAt: h.createdAt,
        changedByEmail: h.changedByUser?.email ?? null,
        changedByRole: h.changedByUser?.role ?? null,
      })),
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    }
  }

  async updateStatus(userId: bigint, orderId: bigint, dto: UpdateOrderStatusDto) {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: true },
    })
    if (!wholesaler?.shop) throw new ForbiddenException()

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        retailer: { include: { user: { select: { id: true, email: true } } } },
      },
    })
    if (!order || order.shopId !== wholesaler.shop.id) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '訂單不存在' })
    }

    const allowed = VALID_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `無法從 ${order.status} 轉換為 ${dto.status}`,
      })
    }

    const timestamps: Partial<Record<string, Date>> = {}
    if (dto.status === OrderStatus.paid) timestamps['paidAt'] = new Date()
    if (dto.status === OrderStatus.shipped) timestamps['shippedAt'] = new Date()
    if (dto.status === OrderStatus.completed) timestamps['completedAt'] = new Date()

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          wholesalerNote: dto.note ?? order.wholesalerNote,
          ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
          ...timestamps,
        },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status,
          changedBy: userId,
          note: dto.note,
        },
      })

      if (dto.status === OrderStatus.completed) {
        await Promise.all(
          order.items.map((item) =>
            tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: { decrement: item.quantity },
                reservedStock: { decrement: item.quantity },
              },
            }),
          ),
        )
      }

      if (dto.status === OrderStatus.refunded) {
        await this.releaseReservedStock(tx, order.items)
      }
    })

    const result = await this.findById(userId, UserRole.wholesaler, orderId)

    this.eventEmitter.emit(
      ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        result.id,
        result.orderNumber,
        order.retailer.userId.toString(),
        order.retailer.user.email ?? '',
        dto.status,
        null,
      ),
    )

    // Re-check stock after actual decrement on completion
    if (dto.status === OrderStatus.completed) {
      void this.inventory.checkVariants(order.items.map((i) => i.variantId))
    }

    return result
  }

  async cancel(userId: bigint, orderId: bigint) {
    const retailer = await this.prisma.retailer.findUnique({ where: { userId } })
    if (!retailer) throw new ForbiddenException()

    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order || order.retailerId !== retailer.id) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '訂單不存在' })
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException({ code: 'INVALID_STATE_TRANSITION', message: '僅 pending 訂單可取消' })
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled, cancelledAt: new Date() },
      })
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: OrderStatus.pending, toStatus: OrderStatus.cancelled, changedBy: userId },
      })
      await this.releaseReservedStock(tx, order.items)
    })

    return this.findById(userId, UserRole.retailer, orderId)
  }

  private async releaseReservedStock(
    tx: Prisma.TransactionClient,
    items: { variantId: bigint; quantity: number }[],
  ): Promise<void> {
    await Promise.all(
      items.map((item) =>
        tx.productVariant.update({
          where: { id: item.variantId },
          data: { reservedStock: { decrement: item.quantity } },
        }),
      ),
    )
  }

  private async verifyAccess(
    userId: bigint,
    role: UserRole,
    order: { retailer: { userId: bigint }; shopId: bigint },
  ): Promise<void> {
    if (role === UserRole.retailer) {
      if (order.retailer.userId !== userId) throw new ForbiddenException()
    } else if (role === UserRole.wholesaler) {
      const wholesaler = await this.prisma.wholesaler.findUnique({
        where: { userId },
        include: { shop: true },
      })
      if (wholesaler?.shop?.id !== order.shopId) throw new ForbiddenException()
    }
  }

  private formatList(o: OrderRow) {
    return {
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total.toString(),
      itemCount: o._count.items,
      createdAt: o.createdAt,
      shop: { id: o.shop.id.toString(), name: o.shop.name },
      retailer: { id: o.retailer.id.toString(), shopName: o.retailer.shopName },
    }
  }
}
