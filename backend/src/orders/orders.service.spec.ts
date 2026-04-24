import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { OrderStatus, Prisma, UserRole } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { InventoryService } from '../inventory/inventory.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrdersService } from './orders.service'

// ── helpers ──────────────────────────────────────────────────────────────────

const D = (n: string | number) => new Prisma.Decimal(n)

const makeRetailer = (overrides = {}) => ({
  id: BigInt(1), userId: BigInt(10), shopName: '測試零售商', ...overrides,
})

const makeWholesaler = (shopId = BigInt(2)) => ({
  userId: BigInt(20),
  shop: { id: shopId, name: '測試商城', isActive: true, deletedAt: null, minOrderAmount: D(0) },
})

const makeShop = (overrides = {}) => ({
  id: BigInt(2), name: '測試商城', isActive: true, deletedAt: null, minOrderAmount: D(0), ...overrides,
})

const makeVariant = (overrides = {}) => ({
  id: BigInt(100), sku: 'SKU-001', size: '90cm', color: '粉紅',
  stock: 10, reservedStock: 0, priceOverride: null,
  product: { name: '小熊上衣', basePrice: D('250'), shopId: BigInt(2) },
  ...overrides,
})

const makeOrder = (overrides = {}) => ({
  id: BigInt(999), orderNumber: 'ORD-20260101-0999',
  status: OrderStatus.pending, shopId: BigInt(2), retailerId: BigInt(1),
  subtotal: D('250'), shippingFee: D('0'), discount: D('0'), total: D('250'),
  shippingAddress: '台北市', contactName: '測試', contactPhone: '0912345678',
  retailerNote: null, wholesalerNote: null,
  paidAt: null, shippedAt: null, completedAt: null, cancelledAt: null,
  createdAt: new Date(),
  items: [{ id: BigInt(1), variantId: BigInt(100), quantity: 1, productName: '小熊上衣', sku: 'SKU-001', size: '90cm', color: '粉紅', unitPrice: D('250'), subtotal: D('250') }],
  statusHistory: [],
  shop: { id: BigInt(2), name: '測試商城' },
  retailer: { id: BigInt(1), shopName: '零售商', userId: BigInt(10), user: { email: 'retailer@example.com' } },
  ...overrides,
})

// ── setup ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService
  // Keep direct reference to mock so we can call .mockResolvedValue without TS fighting us
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let p: Record<string, any>

  beforeEach(async () => {
    p = {
      retailer:       { findUnique: jest.fn() },
      wholesaler:     { findUnique: jest.fn() },
      shop:           { findFirst: jest.fn() },
      productVariant: { findMany: jest.fn(), update: jest.fn() },
      order:          { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      $transaction:   jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: p },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: InventoryService, useValue: { checkVariants: jest.fn() } },
      ],
    }).compile()

    service = module.get(OrdersService)
  })

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const userId = BigInt(10)
    const dto: CreateOrderDto = {
      shopId: 2,
      items: [{ variantId: 100, quantity: 1 }],
      shippingAddress: '台北市', contactName: '測試', contactPhone: '0912345678',
    }

    it('retailer 不存在時拋出 ForbiddenException', async () => {
      p.retailer.findUnique.mockResolvedValue(null)
      await expect(service.create(userId, dto)).rejects.toThrow(ForbiddenException)
    })

    it('商城不存在時拋出 NotFoundException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(null)
      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException)
    })

    it('部分 variant 不存在時拋出 BadRequestException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(makeShop())
      p.productVariant.findMany.mockResolvedValue([]) // 0 found, expected 1
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException)
    })

    it('商品不屬於此商城時拋出 BadRequestException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(makeShop())
      p.productVariant.findMany.mockResolvedValue([
        makeVariant({ product: { name: 'X', basePrice: D('100'), shopId: BigInt(99) } }),
      ])
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException)
    })

    it('庫存不足時拋出 BadRequestException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(makeShop())
      p.productVariant.findMany.mockResolvedValue([makeVariant({ stock: 0, reservedStock: 0 })])
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException)
    })

    it('未達最低訂單金額時拋出 BadRequestException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(makeShop({ minOrderAmount: D('10000') }))
      p.productVariant.findMany.mockResolvedValue([makeVariant()])
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException)
    })

    it('正常建立訂單時回傳訂單資料', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.shop.findFirst.mockResolvedValue(makeShop())
      p.productVariant.findMany.mockResolvedValue([makeVariant()])

      const order = makeOrder()
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<bigint>) => {
        const tx = {
          order: { create: jest.fn().mockResolvedValue(order), update: jest.fn().mockResolvedValue(order) },
          orderStatusHistory: { create: jest.fn() },
          productVariant: { update: jest.fn() },
        }
        return fn(tx)
      })
      p.order.findUnique.mockResolvedValue(order)

      const result = await service.create(userId, dto)
      expect(result).toMatchObject({ orderNumber: order.orderNumber, status: OrderStatus.pending })
    })
  })

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    const userId = BigInt(20)

    it('wholesaler 無商城時拋出 ForbiddenException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(null)
      await expect(service.updateStatus(userId, BigInt(999), { status: OrderStatus.paid })).rejects.toThrow(ForbiddenException)
    })

    it('訂單不存在時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.order.findUnique.mockResolvedValue(null)
      await expect(service.updateStatus(userId, BigInt(999), { status: OrderStatus.paid })).rejects.toThrow(NotFoundException)
    })

    it('非法狀態轉換（pending → shipped）時拋出 BadRequestException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.pending }))
      const dto: UpdateOrderStatusDto = { status: OrderStatus.shipped }
      await expect(service.updateStatus(userId, BigInt(999), dto)).rejects.toThrow(BadRequestException)
    })

    it('pending → paid 合法轉換', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.order.findUnique
        .mockResolvedValueOnce(makeOrder({ status: OrderStatus.pending }))
        .mockResolvedValueOnce(makeOrder({ status: OrderStatus.paid }))
      p.$transaction.mockResolvedValue(undefined)

      const result = await service.updateStatus(userId, BigInt(999), { status: OrderStatus.paid })
      expect(result).toMatchObject({ status: OrderStatus.paid })
    })

    it('completed 時呼叫庫存 decrement', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.order.findUnique
        .mockResolvedValueOnce(makeOrder({ status: OrderStatus.shipped }))
        .mockResolvedValueOnce(makeOrder({ status: OrderStatus.completed }))

      const variantUpdate = jest.fn()
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          order: { update: jest.fn() },
          orderStatusHistory: { create: jest.fn() },
          productVariant: { update: variantUpdate },
        }
        await fn(tx)
      })

      await service.updateStatus(userId, BigInt(999), { status: OrderStatus.completed })
      expect(variantUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stock: { decrement: 1 }, reservedStock: { decrement: 1 } }),
        }),
      )
    })
  })

  // ── cancel ───────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    const userId = BigInt(10)

    it('retailer 不存在時拋出 ForbiddenException', async () => {
      p.retailer.findUnique.mockResolvedValue(null)
      await expect(service.cancel(userId, BigInt(999))).rejects.toThrow(ForbiddenException)
    })

    it('訂單不屬於此零售商時拋出 NotFoundException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer({ id: BigInt(99) }))
      p.order.findUnique.mockResolvedValue(makeOrder({ retailerId: BigInt(1) }))
      await expect(service.cancel(userId, BigInt(999))).rejects.toThrow(NotFoundException)
    })

    it('非 pending 訂單取消時拋出 BadRequestException', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.paid }))
      await expect(service.cancel(userId, BigInt(999))).rejects.toThrow(BadRequestException)
    })

    it('pending 訂單取消成功並釋放庫存', async () => {
      p.retailer.findUnique.mockResolvedValue(makeRetailer())
      p.order.findUnique
        .mockResolvedValueOnce(makeOrder())
        .mockResolvedValueOnce(makeOrder({ status: OrderStatus.cancelled }))

      const variantUpdate = jest.fn()
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          order: { update: jest.fn() },
          orderStatusHistory: { create: jest.fn() },
          productVariant: { update: variantUpdate },
        }
        await fn(tx)
      })

      const result = await service.cancel(userId, BigInt(999))
      expect(result).toMatchObject({ status: OrderStatus.cancelled })
      expect(variantUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reservedStock: { decrement: 1 } } }),
      )
    })
  })
})
