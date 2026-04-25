import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DiscountType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ShopsService } from './shops.service'

// ── helpers ──────────────────────────────────────────────────────────────────

const D = (n: string | number) => new Prisma.Decimal(n)

const makeShopRow = (overrides = {}) => ({
  id: BigInt(2),
  name: '測試商城',
  slug: 'test-shop',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  minOrderAmount: D(0),
  isActive: true,
  isVipOnly: false,
  _count: { products: 3 },
  ...overrides,
})

const makeWholesaler = (shopId = BigInt(2)) => ({
  id: BigInt(1),
  userId: BigInt(10),
  shop: { id: shopId },
})

const makeRetailer = (overrides = {}) => ({
  id: BigInt(5),
  shopName: '零售商小店',
  user: { email: 'retailer@test.com' },
  ...overrides,
})

const makeVipMember = (overrides = {}) => ({
  id: BigInt(1),
  shopId: BigInt(2),
  retailerId: BigInt(5),
  createdAt: new Date(),
  retailer: makeRetailer(),
  ...overrides,
})

const makeVariant = (overrides = {}) => ({
  id: BigInt(100),
  size: '90cm',
  color: '粉紅',
  product: { shopId: BigInt(2), name: '小熊上衣' },
  ...overrides,
})

// ── setup ─────────────────────────────────────────────────────────────────────

describe('ShopsService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let p: Record<string, any>
  let service: ShopsService

  beforeEach(async () => {
    p = {
      shop:                { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      wholesaler:          { findUnique: jest.fn() },
      shopVipMember:       { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
      variantVipDiscount:  { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
      user:                { findUnique: jest.fn() },
      productVariant:      { findFirst: jest.fn() },
      order:               { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      product:             { count: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: PrismaService, useValue: p },
      ],
    }).compile()

    service = module.get(ShopsService)
  })

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('回傳分頁結果', async () => {
      const row = makeShopRow()
      p.shop.findMany.mockResolvedValue([row])
      p.shop.count.mockResolvedValue(1)

      const result = await service.findAll(1, 20)
      expect(result.total).toBe(1)
      expect(result.items[0]).toMatchObject({ id: '2', name: '測試商城' })
    })

    it('search 參數傳入 where.name 條件', async () => {
      p.shop.findMany.mockResolvedValue([])
      p.shop.count.mockResolvedValue(0)

      await service.findAll(1, 20, '熊')
      const whereArg = p.shop.findMany.mock.calls[0][0].where
      expect(whereArg.name).toMatchObject({ contains: '熊' })
    })
  })

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('找到商城時回傳格式正確', async () => {
      p.shop.findFirst.mockResolvedValue(makeShopRow())
      const result = await service.findById(BigInt(2))
      expect(result).toMatchObject({ id: '2', slug: 'test-shop' })
    })

    it('找不到商城時拋出 NotFoundException', async () => {
      p.shop.findFirst.mockResolvedValue(null)
      await expect(service.findById(BigInt(999))).rejects.toThrow(NotFoundException)
    })
  })

  // ── findMyShop ───────────────────────────────────────────────────────────────

  describe('findMyShop()', () => {
    it('找到商城時回傳格式正確', async () => {
      const shop = makeShopRow()
      p.wholesaler.findUnique.mockResolvedValue({ shop })
      const result = await service.findMyShop(BigInt(10))
      expect(result).toMatchObject({ id: '2' })
    })

    it('非批發商時拋出 ForbiddenException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(null)
      await expect(service.findMyShop(BigInt(99))).rejects.toThrow(ForbiddenException)
    })

    it('批發商尚無商城時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ shop: null })
      await expect(service.findMyShop(BigInt(10))).rejects.toThrow(NotFoundException)
    })
  })

  // ── setVipMode ───────────────────────────────────────────────────────────────

  describe('setVipMode()', () => {
    it('更新 isVipOnly 並回傳更新後商城', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      const updated = makeShopRow({ isVipOnly: true })
      p.shop.update.mockResolvedValue(updated)

      const result = await service.setVipMode(BigInt(10), true)
      expect(result).toMatchObject({ isVipOnly: true })
      expect(p.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVipOnly: true } }),
      )
    })

    it('非批發商時拋出 ForbiddenException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(null)
      await expect(service.setVipMode(BigInt(99), true)).rejects.toThrow(ForbiddenException)
    })
  })

  // ── addVipMember ─────────────────────────────────────────────────────────────

  describe('addVipMember()', () => {
    const userId = BigInt(10)
    const dto = { email: 'retailer@test.com' }

    it('正常新增 VIP 成員', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.user.findUnique.mockResolvedValue({ email: dto.email, retailer: makeRetailer() })
      p.shopVipMember.findUnique.mockResolvedValue(null)
      p.shopVipMember.create.mockResolvedValue({})

      const result = await service.addVipMember(userId, dto)
      expect(result).toMatchObject({ email: dto.email })
      expect(p.shopVipMember.create).toHaveBeenCalled()
    })

    it('Email 不存在時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.user.findUnique.mockResolvedValue(null)
      await expect(service.addVipMember(userId, dto)).rejects.toThrow(NotFoundException)
    })

    it('Email 對應的是批發商帳號時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.user.findUnique.mockResolvedValue({ email: dto.email, retailer: null })
      await expect(service.addVipMember(userId, dto)).rejects.toThrow(NotFoundException)
    })

    it('已是 VIP 成員時拋出 BadRequestException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.user.findUnique.mockResolvedValue({ email: dto.email, retailer: makeRetailer() })
      p.shopVipMember.findUnique.mockResolvedValue({ id: BigInt(1) })
      await expect(service.addVipMember(userId, dto)).rejects.toThrow(BadRequestException)
    })
  })

  // ── removeVipMember ──────────────────────────────────────────────────────────

  describe('removeVipMember()', () => {
    it('成功移除 VIP 成員', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.shopVipMember.findUnique.mockResolvedValue({ id: BigInt(1) })
      p.shopVipMember.delete.mockResolvedValue({})

      await expect(service.removeVipMember(BigInt(10), BigInt(5))).resolves.not.toThrow()
      expect(p.shopVipMember.delete).toHaveBeenCalled()
    })

    it('成員不存在時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.shopVipMember.findUnique.mockResolvedValue(null)
      await expect(service.removeVipMember(BigInt(10), BigInt(5))).rejects.toThrow(NotFoundException)
    })
  })

  // ── setVipDiscount ────────────────────────────────────────────────────────────

  describe('setVipDiscount()', () => {
    const userId = BigInt(10)
    const variantId = BigInt(100)

    it('正常設定百分比折扣（upsert）', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.productVariant.findFirst.mockResolvedValue(makeVariant())
      const record = { id: BigInt(1), variantId, shopId: BigInt(2), discountType: DiscountType.percentage, discountValue: D('10') }
      p.variantVipDiscount.upsert.mockResolvedValue(record)

      const result = await service.setVipDiscount(userId, variantId, { discountType: DiscountType.percentage, discountValue: 10 })
      expect(result).toMatchObject({ discountType: 'percentage', discountValue: '10' })
    })

    it('規格不屬於此商城時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.productVariant.findFirst.mockResolvedValue(makeVariant({ product: { shopId: BigInt(99), name: 'X' } }))
      await expect(
        service.setVipDiscount(userId, variantId, { discountType: DiscountType.percentage, discountValue: 10 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('規格不存在時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.productVariant.findFirst.mockResolvedValue(null)
      await expect(
        service.setVipDiscount(userId, variantId, { discountType: DiscountType.percentage, discountValue: 10 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('百分比超過 100 時拋出 BadRequestException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.productVariant.findFirst.mockResolvedValue(makeVariant())
      await expect(
        service.setVipDiscount(userId, variantId, { discountType: DiscountType.percentage, discountValue: 150 }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── removeVipDiscount ─────────────────────────────────────────────────────────

  describe('removeVipDiscount()', () => {
    it('成功移除折扣設定', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.variantVipDiscount.findUnique.mockResolvedValue({ id: BigInt(1) })
      p.variantVipDiscount.delete.mockResolvedValue({})

      await expect(service.removeVipDiscount(BigInt(10), BigInt(100))).resolves.not.toThrow()
      expect(p.variantVipDiscount.delete).toHaveBeenCalled()
    })

    it('折扣不存在時拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler())
      p.variantVipDiscount.findUnique.mockResolvedValue(null)
      await expect(service.removeVipDiscount(BigInt(10), BigInt(100))).rejects.toThrow(NotFoundException)
    })
  })

  // ── updateMyShop ──────────────────────────────────────────────────────────────

  describe('updateMyShop()', () => {
    it('正常更新並回傳更新後資料', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ id: BigInt(1) })
      p.shop.findUnique.mockResolvedValue({ id: BigInt(2) })
      p.shop.update.mockResolvedValue(makeShopRow({ name: '新名稱' }))

      const result = await service.updateMyShop(BigInt(10), { name: '新名稱' })
      expect(result).toMatchObject({ name: '新名稱' })
    })

    it('非批發商時拋出 ForbiddenException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(null)
      await expect(service.updateMyShop(BigInt(99), { name: '新名稱' })).rejects.toThrow(ForbiddenException)
    })
  })

  // ── isVipMember ──────────────────────────────────────────────────────────────

  describe('isVipMember()', () => {
    it('是成員時回傳 true', async () => {
      p.shopVipMember.findUnique.mockResolvedValue({ id: BigInt(1) })
      expect(await service.isVipMember(BigInt(2), BigInt(5))).toBe(true)
    })

    it('不是成員時回傳 false', async () => {
      p.shopVipMember.findUnique.mockResolvedValue(null)
      expect(await service.isVipMember(BigInt(2), BigInt(5))).toBe(false)
    })
  })
})
