import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from './cart.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const D = (n: string | number) => new Prisma.Decimal(n);

const makeVariant = (overrides = {}) => ({
  id: BigInt(1),
  sku: 'SKU-001',
  size: '90cm',
  color: '粉紅',
  priceOverride: null,
  product: {
    id: BigInt(10),
    name: '小熊上衣',
    basePrice: D('250'),
    shopId: BigInt(2),
    shop: { name: '測試商城', slug: 'test-shop' },
    images: [{ url: 'https://example.com/img.jpg' }],
  },
  ...overrides,
});

// ── setup ─────────────────────────────────────────────────────────────────────

describe('CartService', () => {
  let service: CartService;
  let redis: {
    hgetall: jest.Mock;
    hget: jest.Mock;
    hset: jest.Mock;
    expire: jest.Mock;
    hexists: jest.Mock;
    hdel: jest.Mock;
    del: jest.Mock;
  };
  let prisma: { productVariant: { findMany: jest.Mock; findUnique: jest.Mock } };

  const userId = BigInt(10);

  beforeEach(async () => {
    redis = {
      hgetall: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      expire: jest.fn(),
      hexists: jest.fn(),
      hdel: jest.fn(),
      del: jest.fn(),
    };

    prisma = {
      productVariant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CartService);
  });

  // ── getCart ─────────────────────────────────────────────────────────────────

  describe('getCart()', () => {
    it('購物車為空時回傳空陣列與 total 0', async () => {
      redis.hgetall.mockResolvedValue({});
      const result = await service.getCart(userId);
      expect(result).toEqual({ items: [], total: '0' });
    });

    it('有商品時回傳正確計算結果', async () => {
      redis.hgetall.mockResolvedValue({ '1': '2' }); // variantId=1, qty=2
      prisma.productVariant.findMany.mockResolvedValue([makeVariant()] as never);

      const result = await service.getCart(userId);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        variantId: '1',
        quantity: 2,
        unitPrice: '250',
        subtotal: '500.00',
      });
      expect(result.total).toBe('500.00');
    });

    it('有 priceOverride 時以覆蓋價格計算', async () => {
      redis.hgetall.mockResolvedValue({ '1': '1' });
      prisma.productVariant.findMany.mockResolvedValue([
        makeVariant({ priceOverride: D('199') }),
      ] as never);

      const result = await service.getCart(userId);
      expect(result.items[0]).toMatchObject({ unitPrice: '199', subtotal: '199.00' });
      expect(result.total).toBe('199.00');
    });

    it('variant 在 Redis 存在但 DB 已刪除時略過該項目', async () => {
      redis.hgetall.mockResolvedValue({ '999': '1' });
      prisma.productVariant.findMany.mockResolvedValue([]); // not found in DB

      const result = await service.getCart(userId);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe('0.00');
    });
  });

  // ── addItem ──────────────────────────────────────────────────────────────────

  describe('addItem()', () => {
    it('variant 不存在時拋出 NotFoundException', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(service.addItem(userId, { variantId: 999, quantity: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('新商品：直接設定數量並回傳購物車', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: BigInt(1) } as never);
      redis.hget.mockResolvedValue(null); // not in cart yet
      redis.hset.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.hgetall.mockResolvedValue({ '1': '3' });
      prisma.productVariant.findMany.mockResolvedValue([makeVariant()] as never);

      await service.addItem(userId, { variantId: 1, quantity: 3 });
      expect(redis.hset).toHaveBeenCalledWith('cart:10', '1', 3);
    });

    it('既有商品：累加數量', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: BigInt(1) } as never);
      redis.hget.mockResolvedValue('2'); // already 2 in cart
      redis.hset.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.hgetall.mockResolvedValue({ '1': '5' });
      prisma.productVariant.findMany.mockResolvedValue([makeVariant()] as never);

      await service.addItem(userId, { variantId: 1, quantity: 3 });
      expect(redis.hset).toHaveBeenCalledWith('cart:10', '1', 5); // 2 + 3
    });

    it('設定 7 天 TTL', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: BigInt(1) } as never);
      redis.hget.mockResolvedValue(null);
      redis.hset.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.hgetall.mockResolvedValue({ '1': '1' });
      prisma.productVariant.findMany.mockResolvedValue([makeVariant()] as never);

      await service.addItem(userId, { variantId: 1, quantity: 1 });
      expect(redis.expire).toHaveBeenCalledWith('cart:10', 7 * 24 * 60 * 60);
    });
  });

  // ── updateItem ───────────────────────────────────────────────────────────────

  describe('updateItem()', () => {
    it('購物車中無此商品時拋出 NotFoundException', async () => {
      redis.hexists.mockResolvedValue(0);
      await expect(service.updateItem(userId, 1, 5)).rejects.toThrow(NotFoundException);
    });

    it('更新數量並回傳購物車', async () => {
      redis.hexists.mockResolvedValue(1);
      redis.hset.mockResolvedValue(1);
      redis.hgetall.mockResolvedValue({ '1': '5' });
      prisma.productVariant.findMany.mockResolvedValue([makeVariant()] as never);

      await service.updateItem(userId, 1, 5);
      expect(redis.hset).toHaveBeenCalledWith('cart:10', '1', 5);
    });
  });

  // ── removeItem ───────────────────────────────────────────────────────────────

  describe('removeItem()', () => {
    it('從 Redis 刪除指定 variant', async () => {
      redis.hdel.mockResolvedValue(1);
      redis.hgetall.mockResolvedValue({});

      await service.removeItem(userId, 1);
      expect(redis.hdel).toHaveBeenCalledWith('cart:10', '1');
    });
  });

  // ── clearCart ────────────────────────────────────────────────────────────────

  describe('clearCart()', () => {
    it('刪除整個購物車 key', async () => {
      redis.del.mockResolvedValue(1);
      await service.clearCart(userId);
      expect(redis.del).toHaveBeenCalledWith('cart:10');
    });
  });
});
