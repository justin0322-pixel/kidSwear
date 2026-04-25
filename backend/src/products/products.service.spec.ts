import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, ProductStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

// ── helpers ──────────────────────────────────────────────────────────────────

const D = (n: string | number) => new Prisma.Decimal(n);

const makeShop = (overrides = {}) => ({
  id: BigInt(2),
  name: '測試商城',
  isActive: true,
  deletedAt: null,
  minOrderAmount: D(0),
  ...overrides,
});

const makeProduct = (overrides = {}) => ({
  id: BigInt(10),
  name: '小熊上衣',
  category: '上衣',
  description: '好看的上衣',
  skuPrefix: 'BEAR',
  ageRange: '1-2歲',
  gender: 'unisex',
  basePrice: D('250'),
  suggestedRetailPrice: null,
  attributes: {},
  status: ProductStatus.active,
  deletedAt: null,
  createdAt: new Date(),
  shopId: BigInt(2),
  images: [
    {
      id: BigInt(1),
      url: 'https://example.com/img.jpg',
      isPrimary: true,
      altText: null,
      sortOrder: 0,
    },
  ],
  variants: [
    {
      id: BigInt(100),
      sku: 'BEAR-90-PINK-0',
      size: '90cm',
      color: '粉紅',
      stock: 10,
      priceOverride: null,
    },
  ],
  productTags: [{ tag: { name: '嬰幼兒' } }],
  shop: { id: BigInt(2), name: '測試商城' },
  ...overrides,
});

// ── setup ─────────────────────────────────────────────────────────────────────

describe('ProductsService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let p: Record<string, any>;
  let service: ProductsService;

  beforeEach(async () => {
    p = {
      wholesaler: { findUnique: jest.fn() },
      product: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), update: jest.fn() },
      shop: { findFirst: jest.fn().mockResolvedValue({ isVipOnly: false }) },
      shopVipMember: { findUnique: jest.fn().mockResolvedValue(null) },
      variantVipDiscount: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: p },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('回傳分頁結果與 total', async () => {
      const product = makeProduct();
      p.product.findMany.mockResolvedValue([product]);
      p.product.count.mockResolvedValue(1);

      const result = await service.findAll({});
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ id: '10', name: '小熊上衣', basePrice: '250' });
    });

    it('預設 page=1, pageSize=20', async () => {
      p.product.findMany.mockResolvedValue([]);
      p.product.count.mockResolvedValue(0);

      const result = await service.findAll({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('shopId 篩選時傳入 BigInt where 條件', async () => {
      p.product.findMany.mockResolvedValue([]);
      p.product.count.mockResolvedValue(0);

      await service.findAll({ shopId: '2' });
      const whereArg = p.product.findMany.mock.calls[0][0].where;
      expect(whereArg.shopId).toEqual(BigInt(2));
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('找到商品時回傳格式正確', async () => {
      p.product.findFirst.mockResolvedValue(makeProduct());

      const result = await service.findById(BigInt(10));
      expect(result).toMatchObject({
        id: '10',
        name: '小熊上衣',
        basePrice: '250',
        tags: ['嬰幼兒'],
        shop: { id: '2', name: '測試商城' },
      });
      expect(result.variants[0]).toMatchObject({ sku: 'BEAR-90-PINK-0', price: '250' });
    });

    it('商品不存在時拋出 NotFoundException', async () => {
      p.product.findFirst.mockResolvedValue(null);
      await expect(service.findById(BigInt(999))).rejects.toThrow(NotFoundException);
    });

    it('variant 有 priceOverride 時以覆蓋價格回傳', async () => {
      p.product.findFirst.mockResolvedValue(
        makeProduct({
          variants: [
            {
              id: BigInt(100),
              sku: 'BEAR-90-PINK-0',
              size: '90cm',
              color: '粉紅',
              stock: 10,
              priceOverride: D('199'),
            },
          ],
        }),
      );
      const result = await service.findById(BigInt(10));
      expect(result.variants[0].price).toBe('199');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const userId = BigInt(20);
    const dto: CreateProductDto = {
      name: '小熊上衣',
      category: '上衣',
      basePrice: '250',
      variants: [{ size: '90cm', color: '粉紅', stock: 10 }],
    };

    it('批發商無商城時拋出 ForbiddenException', async () => {
      p.wholesaler.findUnique.mockResolvedValue(null);
      await expect(service.create(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('正常建立商品並回傳 findById 結果', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ userId, shop: makeShop() });
      const created = makeProduct();
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<bigint>) => {
        const tx = {
          product: { create: jest.fn().mockResolvedValue(created) },
          productVariant: { createMany: jest.fn() },
          productTag: { createMany: jest.fn() },
          productImage: { createMany: jest.fn() },
        };
        return fn(tx);
      });
      p.product.findFirst.mockResolvedValue(created);

      const result = await service.create(userId, dto);
      expect(result).toMatchObject({ name: '小熊上衣' });
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const userId = BigInt(20);
    const productId = BigInt(10);

    it('非擁有者（商品屬於其他商城）拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ userId, shop: makeShop() });
      p.product.findFirst.mockResolvedValue(null); // ownership check fails
      await expect(service.update(userId, productId, { name: '新名稱' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('正常更新並回傳更新後商品', async () => {
      const product = makeProduct({ name: '新名稱' });
      p.wholesaler.findUnique.mockResolvedValue({ userId, shop: makeShop() });
      p.product.findFirst
        .mockResolvedValueOnce({ id: productId }) // ownership check passes
        .mockResolvedValueOnce(product); // findById call

      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          product: { update: jest.fn() },
          productTag: { deleteMany: jest.fn(), createMany: jest.fn() },
          productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
        };
        await fn(tx);
      });

      const result = await service.update(userId, productId, { name: '新名稱' });
      expect(result).toMatchObject({ name: '新名稱' });
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    const userId = BigInt(20);
    const productId = BigInt(10);

    it('非擁有者拋出 NotFoundException', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ userId, shop: makeShop() });
      p.product.findFirst.mockResolvedValue(null);
      await expect(service.remove(userId, productId)).rejects.toThrow(NotFoundException);
    });

    it('正常軟刪除：呼叫 product.update 設定 deletedAt', async () => {
      p.wholesaler.findUnique.mockResolvedValue({ userId, shop: makeShop() });
      p.product.findFirst.mockResolvedValue({ id: productId });
      p.product.update.mockResolvedValue({});

      await service.remove(userId, productId);
      expect(p.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: productId },
          data: expect.objectContaining({ status: ProductStatus.archived }),
        }),
      );
    });
  });
});
