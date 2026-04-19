import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserRole, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtPayload } from './interfaces/jwt-payload.interface'

const BCRYPT_COST = 12
const REFRESH_COOKIE = 'refresh_token'

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : suffix
}

type AuthResult = {
  user: { id: string; email: string; role: UserRole }
  accessToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, res: Response): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_RESOURCE',
        message: 'Email 已被註冊',
      })
    }

    if (dto.role === UserRole.wholesaler && !dto.companyName) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '批發商需填寫公司名稱',
      })
    }
    if (dto.role === UserRole.retailer && !dto.shopName) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '零售商需填寫店家名稱',
      })
    }
    if (dto.role === UserRole.retailer && !dto.shippingAddress) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '零售商需填寫收件地址',
      })
    }
    if (dto.role === UserRole.admin) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '不允許此角色',
      })
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        status: UserStatus.active,
        wholesaler:
          dto.role === UserRole.wholesaler
            ? {
                create: {
                  companyName: dto.companyName!,
                  contactPerson: dto.contactPerson,
                  shop: {
                    create: {
                      name: dto.companyName!,
                      slug: toSlug(dto.companyName!),
                    },
                  },
                },
              }
            : undefined,
        retailer:
          dto.role === UserRole.retailer
            ? {
                create: {
                  shopName: dto.shopName!,
                  contactPerson: dto.contactPerson,
                  shippingAddress: dto.shippingAddress!,
                },
              }
            : undefined,
      },
    })

    return this.issueTokens(user.id, user.email!, user.role, res)
  }

  async login(dto: LoginDto, res: Response): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email)
    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤',
      })
    }
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號已停用',
      })
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤',
      })
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return this.issueTokens(user.id, user.email!, user.role, res)
  }

  async refresh(req: Request): Promise<{ accessToken: string }> {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE]
    if (!token) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: '請重新登入',
      })
    }

    let payload: JwtPayload
    try {
      payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token 已過期，請重新登入',
      })
    }

    const user = await this.users.findById(BigInt(payload.sub))
    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException()
    }

    const accessToken = this.signAccessToken(payload.sub, payload.email, payload.role)
    return { accessToken }
  }

  logout(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions())
  }

  async me(sub: string): Promise<object> {
    const user = await this.users.findByIdWithProfile(BigInt(sub))
    if (!user) throw new UnauthorizedException()

    const profile =
      user.wholesaler
        ? { companyName: user.wholesaler.companyName, contactPerson: user.wholesaler.contactPerson }
        : user.retailer
          ? { shopName: user.retailer.shopName, contactPerson: user.retailer.contactPerson }
          : null

    return {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      profile,
    }
  }

  private issueTokens(id: bigint, email: string, role: UserRole, res: Response): AuthResult {
    const sub = id.toString()
    const payload: JwtPayload = { sub, email, role }

    const accessToken = this.signAccessToken(sub, email, role)
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    })

    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions())

    return { user: { id: sub, email, role }, accessToken }
  }

  private signAccessToken(sub: string, email: string, role: UserRole): string {
    const payload: JwtPayload = { sub, email, role }
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    })
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    }
  }
}
