import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserRole, UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  id: BigInt(1),
  email: 'user@test.com',
  passwordHash: '$2b$12$hashedpassword',
  role: UserRole.retailer,
  status: UserStatus.active,
  phone: null,
  wholesaler: null,
  retailer: { shopName: '測試店', contactPerson: '測試', shippingAddress: '台北市' },
  ...overrides,
})

// Mock Response object (only the methods AuthService calls)
const makeMockRes = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
})

// ── setup ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let p: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let usersSvc: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jwtSvc: Record<string, any>
  let service: AuthService

  beforeEach(async () => {
    p = {
      user:             { create: jest.fn(), update: jest.fn() },
      userOauthAccount: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
    }

    usersSvc = {
      findByEmail:          jest.fn(),
      findById:             jest.fn(),
      findByIdWithProfile:  jest.fn(),
    }

    jwtSvc = {
      sign:   jest.fn().mockReturnValue('mock.jwt.token'),
      verify: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService,  useValue: p },
        { provide: UsersService,   useValue: usersSvc },
        { provide: JwtService,     useValue: jwtSvc },
        {
          provide: ConfigService,
          useValue: {
            get:        jest.fn().mockReturnValue('test-value'),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  // ── register ─────────────────────────────────────────────────────────────────

  describe('register()', () => {
    const res = makeMockRes()

    it('零售商正常註冊', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      const user = makeUser()
      p.user.create.mockResolvedValue(user)

      const result = await service.register(
        { email: 'new@test.com', password: 'pass1234', role: UserRole.retailer, contactPerson: '王小明', shopName: '我的店', shippingAddress: '台北市' },
        res as never,
      )
      expect(result.accessToken).toBe('mock.jwt.token')
      expect(result.user.role).toBe(UserRole.retailer)
      expect(res.cookie).toHaveBeenCalled()
    })

    it('批發商正常註冊', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      const user = makeUser({ role: UserRole.wholesaler, wholesaler: { companyName: 'ABC', contactPerson: '老闆' } })
      p.user.create.mockResolvedValue(user)

      const result = await service.register(
        { email: 'w@test.com', password: 'pass1234', role: UserRole.wholesaler, contactPerson: '老闆', companyName: 'ABC 公司' },
        res as never,
      )
      expect(result.user.role).toBe(UserRole.wholesaler)
    })

    it('Email 已被使用時拋出 ConflictException', async () => {
      usersSvc.findByEmail.mockResolvedValue(makeUser())
      await expect(
        service.register({ email: 'existing@test.com', password: 'pass1234', role: UserRole.retailer, contactPerson: '王小明', shopName: '店', shippingAddress: '地址' }, res as never),
      ).rejects.toThrow(ConflictException)
    })

    it('批發商缺少 companyName 時拋出 BadRequestException', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      await expect(
        service.register({ email: 'w@test.com', password: 'pass1234', role: UserRole.wholesaler, contactPerson: '老闆' }, res as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('零售商缺少 shopName 時拋出 BadRequestException', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      await expect(
        service.register({ email: 'r@test.com', password: 'pass1234', role: UserRole.retailer, contactPerson: '王小明', shippingAddress: '台北市' }, res as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('零售商缺少 shippingAddress 時拋出 BadRequestException', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      await expect(
        service.register({ email: 'r@test.com', password: 'pass1234', role: UserRole.retailer, contactPerson: '王小明', shopName: '店' }, res as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('嘗試註冊 admin 角色時拋出 BadRequestException', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      await expect(
        service.register({ email: 'a@test.com', password: 'pass1234', role: UserRole.admin, contactPerson: '管理員' }, res as never),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── login ─────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const res = makeMockRes()
    const dto = { email: 'user@test.com', password: 'correctpass' }

    it('密碼正確時登入成功', async () => {
      // Use a real bcrypt hash for 'correctpass'
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('correctpass', 1)
      usersSvc.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash }))
      p.user.update.mockResolvedValue({})

      const result = await service.login(dto, res as never)
      expect(result.accessToken).toBe('mock.jwt.token')
      expect(res.cookie).toHaveBeenCalled()
    })

    it('使用者不存在時拋出 UnauthorizedException', async () => {
      usersSvc.findByEmail.mockResolvedValue(null)
      await expect(service.login(dto, res as never)).rejects.toThrow(UnauthorizedException)
    })

    it('密碼錯誤時拋出 UnauthorizedException', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('otherpass', 1)
      usersSvc.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash }))
      await expect(service.login(dto, res as never)).rejects.toThrow(UnauthorizedException)
    })

    it('帳號停用時拋出 UnauthorizedException', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('correctpass', 1)
      usersSvc.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash, status: UserStatus.suspended }))
      await expect(service.login(dto, res as never)).rejects.toThrow(UnauthorizedException)
    })

    it('OAuth 帳號（無 passwordHash）拋出 UnauthorizedException', async () => {
      usersSvc.findByEmail.mockResolvedValue(makeUser({ passwordHash: null }))
      await expect(service.login(dto, res as never)).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── refresh ───────────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('有效的 refresh token 時回傳新 access token', async () => {
      jwtSvc.verify.mockReturnValue({ sub: '1', email: 'user@test.com', role: UserRole.retailer })
      usersSvc.findById.mockResolvedValue(makeUser())

      const req = { cookies: { refresh_token: 'valid.refresh.token' } }
      const result = await service.refresh(req as never)
      expect(result.accessToken).toBe('mock.jwt.token')
    })

    it('無 cookie 時拋出 UnauthorizedException', async () => {
      const req = { cookies: {} }
      await expect(service.refresh(req as never)).rejects.toThrow(UnauthorizedException)
    })

    it('Token 過期或無效時拋出 UnauthorizedException', async () => {
      jwtSvc.verify.mockImplementation(() => { throw new Error('expired') })
      const req = { cookies: { refresh_token: 'expired.token' } }
      await expect(service.refresh(req as never)).rejects.toThrow(UnauthorizedException)
    })

    it('使用者已停用時拋出 UnauthorizedException', async () => {
      jwtSvc.verify.mockReturnValue({ sub: '1', email: 'user@test.com', role: UserRole.retailer })
      usersSvc.findById.mockResolvedValue(makeUser({ status: UserStatus.suspended }))

      const req = { cookies: { refresh_token: 'valid.token' } }
      await expect(service.refresh(req as never)).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── changePassword ────────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('正確舊密碼時成功更新', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('oldpass', 1)
      usersSvc.findById.mockResolvedValue(makeUser({ passwordHash: hash }))
      p.user.update.mockResolvedValue({})

      await expect(service.changePassword(BigInt(1), 'oldpass', 'newpass123')).resolves.not.toThrow()
      expect(p.user.update).toHaveBeenCalled()
    })

    it('舊密碼錯誤時拋出 BadRequestException', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('oldpass', 1)
      usersSvc.findById.mockResolvedValue(makeUser({ passwordHash: hash }))

      await expect(service.changePassword(BigInt(1), 'wrongpass', 'newpass123')).rejects.toThrow(BadRequestException)
    })

    it('OAuth 帳號（無 passwordHash）拋出 BadRequestException', async () => {
      usersSvc.findById.mockResolvedValue(makeUser({ passwordHash: null }))
      await expect(service.changePassword(BigInt(1), 'anypass', 'newpass123')).rejects.toThrow(BadRequestException)
    })
  })

  // ── logout ────────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('呼叫 clearCookie', () => {
      const res = makeMockRes()
      service.logout(res as never)
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
    })
  })

  // ── getOAuthAccounts ──────────────────────────────────────────────────────────

  describe('getOAuthAccounts()', () => {
    it('回傳已綁定的 OAuth 帳號清單', async () => {
      p.userOauthAccount.findMany.mockResolvedValue([
        { provider: 'line', providerEmail: null, providerName: 'Test', providerAvatar: null, createdAt: new Date() },
      ])
      const result = await service.getOAuthAccounts(BigInt(1))
      expect(result).toHaveLength(1)
      expect(result[0].provider).toBe('line')
    })
  })

  // ── unlinkOAuthAccount ────────────────────────────────────────────────────────

  describe('unlinkOAuthAccount()', () => {
    it('呼叫 deleteMany 解除綁定', async () => {
      p.userOauthAccount.deleteMany.mockResolvedValue({})
      await service.unlinkOAuthAccount(BigInt(1), 'line' as never)
      expect(p.userOauthAccount.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: BigInt(1) }) }),
      )
    })
  })
})
