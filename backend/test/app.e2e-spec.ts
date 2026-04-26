/// <reference types="jest" />
import { INestApplication } from '@nestjs/common';
import { DiscountType, OrderStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { buildMockPrisma, createTestApp, type MockPrisma } from './helpers/app.helper';

// ── helpers ──────────────────────────────────────────────────────────────────

const D = (n: string) => new Prisma.Decimal(n);

const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';

function makeToken(sub: number, role: UserRole): string {
  return jwt.sign({ sub: String(sub), role }, JWT_SECRET, { expiresIn: '1h' });
}

const makeUser = (overrides = {}) => ({
  id: BigInt(1),
  email: 'test@example.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PsNKe2', // 'Password1'
  role: UserRole.wholesaler,
  status: UserStatus.active,
  deletedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeShop = (overrides = {}) => ({
  id: BigInt(2),
  name: '測試商城',
  slug: 'test-shop',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  minOrderAmount: D('0'),
  isActive: true,
  isVipOnly: false,
  deletedAt: null,
  _count: { products: 3 },
  ...overrides,
});

const makeRetailer = (overrides = {}) => ({
  id: BigInt(5),
  userId: BigInt(10),
  shopName: '測試零售商',
  contactPerson: '李小花',
  shippingAddress: '台北市',
  phone: null,
  ...overrides,
});

const makeWholesaler = (overrides = {}) => ({
  id: BigInt(1),
  userId: BigInt(20),
  companyName: '測試批發商',
  shop: makeShop(),
  lineNotifyToken: null,
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  id: BigInt(999),
  orderNumber: 'ORD-20260101-0999',
  status: OrderStatus.pending,
  shopId: BigInt(2),
  retailerId: BigInt(5),
  subtotal: D('250'),
  shippingFee: D('0'),
  discount: D('0'),
  total: D('250'),
  trackingNumber: null,
  shippingAddress: '台北市',
  contactName: '測試',
  contactPhone: '0912345678',
  retailerNote: null,
  wholesalerNote: null,
  paidAt: null,
  shippedAt: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  items: [
    {
      id: BigInt(1),
      variantId: BigInt(100),
      quantity: 1,
      productName: '小熊上衣',
      sku: 'SKU-001',
      size: '90cm',
      color: '粉紅',
      unitPrice: D('250'),
      subtotal: D('250'),
    },
  ],
  statusHistory: [],
  _count: { items: 1 },
  shop: { id: BigInt(2), name: '測試商城' },
  retailer: {
    id: BigInt(5),
    shopName: '零售商',
    userId: BigInt(10),
    user: { email: 'retailer@example.com' },
  },
  ...overrides,
});

const WHOLESALER_PAYLOAD = {
  email: 'wholesaler@example.com',
  password: 'Password1!',
  role: 'wholesaler',
  contactPerson: '王小明',
  companyName: '測試批發商',
};

const RETAILER_PAYLOAD = {
  email: 'retailer@example.com',
  password: 'Password1!',
  role: 'retailer',
  contactPerson: '李小花',
  shopName: '測試零售店',
  shippingAddress: '台北市信義區松仁路100號',
};

// ── setup ─────────────────────────────────────────────────────────────────────

describe('App E2E', () => {
  let app: INestApplication;
  let p: MockPrisma;

  beforeAll(async () => {
    p = buildMockPrisma();
    app = await createTestApp(p);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Health ────────────────────────────────────────────────────────────────

  describe('GET /api/v1/health', () => {
    it('回傳 200 + status ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('批發商：成功建立帳號回傳 201 + accessToken', async () => {
      p.user.findFirst.mockResolvedValue(null);
      p.user.create.mockResolvedValue(makeUser({ role: UserRole.wholesaler }));
      p.wholesaler.create.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(WHOLESALER_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('零售商：成功建立帳號', async () => {
      p.user.findFirst.mockResolvedValue(null);
      p.user.create.mockResolvedValue(makeUser({ role: UserRole.retailer }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(RETAILER_PAYLOAD);

      expect(res.status).toBe(201);
    });

    it('Email 重複時回傳 409', async () => {
      p.user.findFirst.mockResolvedValue(makeUser());

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(WHOLESALER_PAYLOAD);

      expect(res.status).toBe(409);
    });

    it('批發商缺少 companyName 時回傳 400', async () => {
      p.user.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...WHOLESALER_PAYLOAD, companyName: undefined });

      expect(res.status).toBe(400);
    });

    it('密碼格式不符時回傳 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...WHOLESALER_PAYLOAD, password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('正確帳密回傳 200 + accessToken', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      p.user.findFirst.mockResolvedValue(makeUser({ passwordHash: hash }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('帳號不存在時回傳 401', async () => {
      p.user.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1!' });

      expect(res.status).toBe(401);
    });

    it('密碼錯誤時回傳 401', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('CorrectPass1!', 12);
      p.user.findFirst.mockResolvedValue(makeUser({ passwordHash: hash }));

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1!' });

      expect(res.status).toBe(401);
    });
  });

  // ── Shops ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/shops', () => {
    it('公開端點回傳 200 + 分頁結構', async () => {
      p.shop.findMany.mockResolvedValue([makeShop()]);
      p.shop.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer()).get('/api/v1/shops');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toHaveProperty('total', 1);
    });
  });

  // ── Products ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/products', () => {
    it('公開端點回傳 200 + 分頁結構', async () => {
      p.product.findMany.mockResolvedValue([
        {
          id: BigInt(10),
          name: '小熊上衣',
          category: '上衣',
          status: 'active',
          basePrice: D('250'),
          images: [{ url: 'https://example.com/img.jpg' }],
          productTags: [{ tag: { id: BigInt(1), name: '嬰幼兒', color: null } }],
          shop: { id: BigInt(1), name: '測試商城' },
          variants: [{ stock: 10, reservedStock: 0, lowStockThreshold: 3 }],
        },
      ]);
      p.product.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer()).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ name: '小熊上衣', basePrice: '250' });
    });

    it('shopId 篩選參數被接受（仍回傳 200）', async () => {
      p.product.findMany.mockResolvedValue([]);
      p.product.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer()).get('/api/v1/products?shopId=1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // ── Orders ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/orders', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ shopId: 1, items: [{ variantId: 100, quantity: 1 }], shippingAddress: '台北市', contactName: '測試', contactPhone: '0912345678' });

      expect(res.status).toBe(401);
    });

    it('DTO 驗證失敗（缺少 items）時回傳 400', async () => {
      const token = makeToken(10, UserRole.retailer);
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ shopId: 1 });

      expect(res.status).toBe(400);
    });

    it('retailer 不存在時回傳 403', async () => {
      const token = makeToken(10, UserRole.retailer);
      p.retailer.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ shopId: 1, items: [{ variantId: 100, quantity: 1 }], shippingAddress: '台北市', contactName: '測試', contactPhone: '0912345678' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/orders');
      expect(res.status).toBe(401);
    });

    it('零售商可取得訂單列表', async () => {
      const token = makeToken(10, UserRole.retailer);
      p.retailer.findUnique.mockResolvedValue(makeRetailer());
      p.order.findMany.mockResolvedValue([makeOrder()]);
      p.order.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toHaveProperty('total', 1);
    });
  });

  describe('PATCH /api/v1/orders/:id/status', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/orders/999/status')
        .send({ status: 'paid' });

      expect(res.status).toBe(401);
    });

    it('wholesaler 無商城時回傳 403', async () => {
      const token = makeToken(20, UserRole.wholesaler);
      p.wholesaler.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/orders/999/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'paid' });

      expect(res.status).toBe(403);
    });

    it('非法狀態值時回傳 400', async () => {
      const token = makeToken(20, UserRole.wholesaler);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/orders/999/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/orders/999/cancel');
      expect(res.status).toBe(401);
    });

    it('retailer 不存在時回傳 403', async () => {
      const token = makeToken(10, UserRole.retailer);
      p.retailer.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders/999/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Cart ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/cart', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/cart');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ variantId: 1, quantity: 1 });

      expect(res.status).toBe(401);
    });

    it('DTO 驗證失敗（quantity 為負數）時回傳 400', async () => {
      const token = makeToken(10, UserRole.retailer);

      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ variantId: 1, quantity: -1 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).delete('/api/v1/cart');
      expect(res.status).toBe(401);
    });
  });

  // ── VIP ───────────────────────────────────────────────────────────────────

  describe('GET /api/v1/shops/my/vip-members', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/shops/my/vip-members');
      expect(res.status).toBe(401);
    });

    it('批發商可取得 VIP 成員列表', async () => {
      const token = makeToken(20, UserRole.wholesaler);
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler());
      p.shopVipMember.findMany.mockResolvedValue([
        { id: BigInt(1), retailerId: BigInt(5), createdAt: new Date(), retailer: { id: BigInt(5), shopName: '零售商A', user: { email: 'a@test.com' } } },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/shops/my/vip-members')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/shops/my/vip-members', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/shops/my/vip-members')
        .send({ email: 'a@test.com' });

      expect(res.status).toBe(401);
    });

    it('DTO 驗證失敗（缺少 email）時回傳 400', async () => {
      const token = makeToken(20, UserRole.wholesaler);

      const res = await request(app.getHttpServer())
        .post('/api/v1/shops/my/vip-members')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('email 不存在時回傳 404', async () => {
      const token = makeToken(20, UserRole.wholesaler);
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler());
      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/shops/my/vip-members')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'nobody@test.com' });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/shops/my/variants/:variantId/vip-discount', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/shops/my/variants/100/vip-discount')
        .send({ discountType: 'percentage', discountValue: 10 });

      expect(res.status).toBe(401);
    });

    it('百分比超過 100 時回傳 400', async () => {
      const token = makeToken(20, UserRole.wholesaler);
      p.wholesaler.findUnique.mockResolvedValue(makeWholesaler());
      p.productVariant.findFirst.mockResolvedValue({
        id: BigInt(100),
        product: { shopId: BigInt(2), name: '上衣' },
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/shops/my/variants/100/vip-discount')
        .set('Authorization', `Bearer ${token}`)
        .send({ discountType: DiscountType.percentage, discountValue: 150 });

      expect(res.status).toBe(400);
    });
  });

  // ── Admin ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/stats', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
    });

    it('非 admin 角色時回傳 403', async () => {
      const token = makeToken(1, UserRole.wholesaler);
      p.user.findUnique.mockResolvedValue(makeUser({ role: UserRole.wholesaler }));

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });

    it('非 admin 角色時回傳 403', async () => {
      const token = makeToken(1, UserRole.retailer);
      p.user.findUnique.mockResolvedValue(makeUser({ role: UserRole.retailer }));

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/status', () => {
    it('未帶 token 時回傳 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/status')
        .send({ status: 'active' });

      expect(res.status).toBe(401);
    });

    it('非 admin 角色時回傳 403', async () => {
      const token = makeToken(1, UserRole.wholesaler);
      p.user.findUnique.mockResolvedValue(makeUser({ role: UserRole.wholesaler }));

      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'active' });

      expect(res.status).toBe(403);
    });
  });
});
