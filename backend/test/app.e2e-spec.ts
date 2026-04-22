import { INestApplication } from '@nestjs/common'
import { UserRole, UserStatus } from '@prisma/client'
import * as request from 'supertest'
import { buildMockPrisma, createTestApp, type MockPrisma } from './helpers/app.helper'

// ── helpers ──────────────────────────────────────────────────────────────────

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
})

const WHOLESALER_PAYLOAD = {
  email: 'wholesaler@example.com',
  password: 'Password1!',
  role: 'wholesaler',
  contactPerson: '王小明',
  companyName: '測試批發商',
}

const RETAILER_PAYLOAD = {
  email: 'retailer@example.com',
  password: 'Password1!',
  role: 'retailer',
  contactPerson: '李小花',
  shopName: '測試零售店',
  shippingAddress: '台北市信義區松仁路100號',
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('App E2E', () => {
  let app: INestApplication
  let p: MockPrisma

  beforeAll(async () => {
    p = buildMockPrisma()
    app = await createTestApp(p)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Health ────────────────────────────────────────────────────────────────

  describe('GET /api/v1/health', () => {
    it('回傳 200 + status ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'ok' })
    })
  })

  // ── Auth ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('批發商：成功建立帳號回傳 201 + accessToken', async () => {
      const created = makeUser({ email: WHOLESALER_PAYLOAD.email, role: UserRole.wholesaler })
      p.user.findFirst.mockResolvedValue(null)  // email 未被使用
      p.user.create.mockResolvedValue(created)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(WHOLESALER_PAYLOAD)

      expect(res.status).toBe(201)
      expect(res.body.data).toHaveProperty('accessToken')
      expect(res.body.data.user.role).toBe('wholesaler')
    })

    it('零售商：成功建立帳號', async () => {
      const created = makeUser({ email: RETAILER_PAYLOAD.email, role: UserRole.retailer })
      p.user.findFirst.mockResolvedValue(null)
      p.user.create.mockResolvedValue(created)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(RETAILER_PAYLOAD)

      expect(res.status).toBe(201)
      expect(res.body.data.user.role).toBe('retailer')
    })

    it('Email 重複時回傳 409', async () => {
      p.user.findFirst.mockResolvedValue(makeUser())  // email 已存在

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(WHOLESALER_PAYLOAD)

      expect(res.status).toBe(409)
    })

    it('批發商缺少 companyName 時回傳 400', async () => {
      p.user.findFirst.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...WHOLESALER_PAYLOAD, companyName: undefined })

      expect(res.status).toBe(400)
    })

    it('密碼格式不符時回傳 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...WHOLESALER_PAYLOAD, password: 'weak' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('正確帳密回傳 200 + accessToken', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('Password1!', 12)
      const user = makeUser({ passwordHash: hash })
      p.user.findFirst.mockResolvedValue(user)
      p.user.update.mockResolvedValue(user)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password1!' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty('accessToken')
    })

    it('帳號不存在時回傳 401', async () => {
      p.user.findFirst.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1!' })

      expect(res.status).toBe(401)
    })

    it('密碼錯誤時回傳 401', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('CorrectPass1!', 12)
      p.user.findFirst.mockResolvedValue(makeUser({ passwordHash: hash }))

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1!' })

      expect(res.status).toBe(401)
    })
  })

  // ── Shops ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/shops', () => {
    it('公開端點回傳 200 + 分頁結構', async () => {
      p.shop.findMany.mockResolvedValue([
        {
          id: BigInt(1), name: '測試商城', slug: 'test-shop',
          description: null, logoUrl: null, bannerUrl: null,
          minOrderAmount: { toString: () => '0' },
          _count: { products: 5 },
        },
      ])
      p.shop.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer()).get('/api/v1/shops')
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.pagination).toHaveProperty('total', 1)
    })
  })

  // ── Products ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/products', () => {
    it('公開端點回傳 200 + 分頁結構', async () => {
      p.product.findMany.mockResolvedValue([
        {
          id: BigInt(10), name: '小熊上衣', category: '上衣',
          basePrice: { toString: () => '250' },
          images: [{ url: 'https://example.com/img.jpg' }],
          productTags: [{ tag: { name: '嬰幼兒' } }],
          shop: { id: BigInt(1), name: '測試商城' },
        },
      ])
      p.product.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer()).get('/api/v1/products')
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0]).toMatchObject({ name: '小熊上衣', basePrice: '250' })
    })

    it('shopId 篩選參數被接受（仍回傳 200）', async () => {
      p.product.findMany.mockResolvedValue([])
      p.product.count.mockResolvedValue(0)

      const res = await request(app.getHttpServer()).get('/api/v1/products?shopId=1')
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })
})
