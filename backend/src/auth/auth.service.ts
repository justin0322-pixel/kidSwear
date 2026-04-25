import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OauthProvider, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_COST = 12;
const REFRESH_COOKIE = 'refresh_token';

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

type AuthResult = {
  user: { id: string; email: string; role: UserRole };
  accessToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, res: Response): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_RESOURCE',
        message: 'Email 已被註冊',
      });
    }

    if (dto.role === UserRole.wholesaler && !dto.companyName) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '批發商需填寫公司名稱',
      });
    }
    if (dto.role === UserRole.retailer && !dto.shopName) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '零售商需填寫店家名稱',
      });
    }
    if (dto.role === UserRole.retailer && !dto.shippingAddress) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '零售商需填寫收件地址',
      });
    }
    if (dto.role === UserRole.admin) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '不允許此角色',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

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
    });

    return this.issueTokens(user.id, user.email!, user.role, res);
  }

  async login(dto: LoginDto, res: Response): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤',
      });
    }
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號已停用',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.email!, user.role, res);
  }

  async refresh(req: Request): Promise<{ accessToken: string }> {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: '請重新登入',
      });
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token 已過期，請重新登入',
      });
    }

    const user = await this.users.findById(BigInt(payload.sub));
    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException();
    }

    const accessToken = this.signAccessToken(payload.sub, payload.email, payload.role);
    return { accessToken };
  }

  logout(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  async me(sub: string): Promise<object> {
    const user = await this.users.findByIdWithProfile(BigInt(sub));
    if (!user) throw new UnauthorizedException();

    const profile = user.wholesaler
      ? { companyName: user.wholesaler.companyName, contactPerson: user.wholesaler.contactPerson }
      : user.retailer
        ? { shopName: user.retailer.shopName, contactPerson: user.retailer.contactPerson }
        : null;

    return {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      phone: user.phone ?? null,
      profile,
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_INVALID', message: '無效的 Token' });
    }
  }

  async getOAuthAccounts(userId: bigint) {
    const accounts = await this.prisma.userOauthAccount.findMany({
      where: { userId },
      select: {
        provider: true,
        providerEmail: true,
        providerName: true,
        providerAvatar: true,
        createdAt: true,
      },
    });
    return accounts.map((a) => ({
      provider: a.provider as string,
      providerEmail: a.providerEmail,
      providerName: a.providerName,
      providerAvatar: a.providerAvatar,
      linkedAt: a.createdAt.toISOString(),
    }));
  }

  async unlinkOAuthAccount(userId: bigint, provider: OauthProvider): Promise<void> {
    await this.prisma.userOauthAccount.deleteMany({ where: { userId, provider } });
  }

  async lineOAuthBind(code: string, userId: bigint): Promise<{ redirectUrl: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('LINE_CALLBACK_URL'),
        client_id: this.config.getOrThrow<string>('LINE_CHANNEL_ID'),
        client_secret: this.config.getOrThrow<string>('LINE_CHANNEL_SECRET'),
      }),
    });

    if (!tokenRes.ok) {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=bind_failed` };
    }

    type LineTokenResponse = { access_token: string };
    const tokenData = (await tokenRes.json()) as LineTokenResponse;

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=bind_failed` };
    }

    type LineProfile = { userId: string; displayName: string; pictureUrl?: string };
    const lineProfile = (await profileRes.json()) as LineProfile;

    const existing = await this.prisma.userOauthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: OauthProvider.line,
          providerUserId: lineProfile.userId,
        },
      },
    });
    if (existing && existing.userId !== userId) {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=oauth_already_bound` };
    }

    await this.prisma.userOauthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: OauthProvider.line,
          providerUserId: lineProfile.userId,
        },
      },
      create: {
        userId,
        provider: OauthProvider.line,
        providerUserId: lineProfile.userId,
        providerName: lineProfile.displayName,
        providerAvatar: lineProfile.pictureUrl,
        accessToken: tokenData.access_token,
      },
      update: {
        userId,
        providerName: lineProfile.displayName,
        providerAvatar: lineProfile.pictureUrl,
        accessToken: tokenData.access_token,
      },
    });

    return { redirectUrl: `${frontendUrl}/retailer/profile?bound=line` };
  }

  async googleOAuthBind(code: string, userId: bigint): Promise<{ redirectUrl: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      }),
    });

    if (!tokenRes.ok) {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=bind_failed` };
    }

    type GoogleTokenResponse = { access_token: string; id_token: string };
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    type GoogleIdToken = { sub: string; email?: string; name?: string; picture?: string };
    let googleUser: GoogleIdToken;
    try {
      googleUser = JSON.parse(
        Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString(),
      ) as GoogleIdToken;
    } catch {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=bind_failed` };
    }

    const existing = await this.prisma.userOauthAccount.findUnique({
      where: {
        provider_providerUserId: { provider: OauthProvider.google, providerUserId: googleUser.sub },
      },
    });
    if (existing && existing.userId !== userId) {
      return { redirectUrl: `${frontendUrl}/retailer/profile?error=oauth_already_bound` };
    }

    await this.prisma.userOauthAccount.upsert({
      where: {
        provider_providerUserId: { provider: OauthProvider.google, providerUserId: googleUser.sub },
      },
      create: {
        userId,
        provider: OauthProvider.google,
        providerUserId: googleUser.sub,
        providerEmail: googleUser.email,
        providerName: googleUser.name,
        providerAvatar: googleUser.picture,
        accessToken: tokenData.access_token,
      },
      update: {
        userId,
        providerEmail: googleUser.email,
        providerName: googleUser.name,
        providerAvatar: googleUser.picture,
        accessToken: tokenData.access_token,
      },
    });

    return { redirectUrl: `${frontendUrl}/retailer/profile?bound=google` };
  }

  getLineAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.getOrThrow<string>('LINE_CHANNEL_ID'),
      redirect_uri: this.config.getOrThrow<string>('LINE_CALLBACK_URL'),
      state,
      scope: 'profile openid email',
    });
    return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  }

  getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      state,
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async googleOAuthExchange(code: string, res: Response): Promise<{ redirectUrl: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      }),
    });

    if (!tokenRes.ok) throw new InternalServerErrorException('Google 授權失敗');

    type GoogleTokenResponse = { access_token: string; id_token: string };
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    // Decode id_token to get user info (no extra request needed)
    type GoogleIdToken = { sub: string; email?: string; name?: string; picture?: string };
    let googleUser: GoogleIdToken;
    try {
      googleUser = JSON.parse(
        Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString(),
      ) as GoogleIdToken;
    } catch {
      throw new InternalServerErrorException('無法解析 Google 使用者資料');
    }

    // Find existing OAuth binding
    const existing = await this.prisma.userOauthAccount.findFirst({
      where: { provider: OauthProvider.google, providerUserId: googleUser.sub },
      include: { user: true },
    });

    if (existing) {
      await this.prisma.userOauthAccount.update({
        where: { id: existing.id },
        data: { accessToken: tokenData.access_token },
      });
      const { accessToken } = this.issueTokens(
        existing.user.id,
        existing.user.email!,
        existing.user.role,
        res,
      );
      const role = existing.user.role;
      const dest = role === UserRole.wholesaler ? '/wholesaler/dashboard' : '/retailer/home';
      return {
        redirectUrl: `${frontendUrl}/auth/callback?token=${accessToken}&role=${role}&redirect=${encodeURIComponent(dest)}`,
      };
    }

    // New Google user — create retailer account
    const user = await this.prisma.user.create({
      data: {
        email: googleUser.email ?? null,
        role: UserRole.retailer,
        status: UserStatus.active,
        retailer: {
          create: {
            shopName: googleUser.name ?? 'Google 用戶',
            contactPerson: googleUser.name ?? 'Google 用戶',
            shippingAddress: '',
          },
        },
        oauthAccounts: {
          create: {
            provider: OauthProvider.google,
            providerUserId: googleUser.sub,
            providerEmail: googleUser.email,
            providerName: googleUser.name,
            providerAvatar: googleUser.picture,
            accessToken: tokenData.access_token,
          },
        },
      },
    });

    const { accessToken } = this.issueTokens(
      user.id,
      googleUser.email ?? '',
      UserRole.retailer,
      res,
    );
    return {
      redirectUrl: `${frontendUrl}/auth/callback?token=${accessToken}&role=retailer&redirect=${encodeURIComponent('/retailer/onboarding')}&new=1`,
    };
  }

  async lineOAuthExchange(code: string, res: Response): Promise<{ redirectUrl: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Exchange code for LINE tokens
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('LINE_CALLBACK_URL'),
        client_id: this.config.getOrThrow<string>('LINE_CHANNEL_ID'),
        client_secret: this.config.getOrThrow<string>('LINE_CHANNEL_SECRET'),
      }),
    });

    if (!tokenRes.ok) {
      throw new InternalServerErrorException('LINE 授權失敗');
    }

    type LineTokenResponse = { access_token: string; id_token?: string };
    const tokenData = (await tokenRes.json()) as LineTokenResponse;

    // Get LINE profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) throw new InternalServerErrorException('無法取得 LINE 使用者資料');

    type LineProfile = { userId: string; displayName: string; pictureUrl?: string };
    const lineProfile = (await profileRes.json()) as LineProfile;

    // Extract email from id_token if present
    let email: string | undefined;
    if (tokenData.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString(),
        ) as { email?: string };
        email = payload.email;
      } catch {
        // id_token decode failed — proceed without email
      }
    }

    // Find existing OAuth binding
    const existing = await this.prisma.userOauthAccount.findFirst({
      where: { provider: OauthProvider.line, providerUserId: lineProfile.userId },
      include: { user: true },
    });

    if (existing) {
      // Update stored tokens
      await this.prisma.userOauthAccount.update({
        where: { id: existing.id },
        data: { accessToken: tokenData.access_token },
      });
      const { accessToken } = this.issueTokens(
        existing.user.id,
        existing.user.email!,
        existing.user.role,
        res,
      );
      const role = existing.user.role;
      const dest = role === UserRole.wholesaler ? '/wholesaler/dashboard' : '/retailer/home';
      return {
        redirectUrl: `${frontendUrl}/auth/callback?token=${accessToken}&role=${role}&redirect=${encodeURIComponent(dest)}`,
      };
    }

    // New LINE user — create account (retailer by default, will onboard)
    const user = await this.prisma.user.create({
      data: {
        email: email ?? null,
        role: UserRole.retailer,
        status: UserStatus.active,
        retailer: {
          create: {
            shopName: lineProfile.displayName,
            contactPerson: lineProfile.displayName,
            shippingAddress: '',
          },
        },
        oauthAccounts: {
          create: {
            provider: OauthProvider.line,
            providerUserId: lineProfile.userId,
            providerEmail: email,
            providerName: lineProfile.displayName,
            providerAvatar: lineProfile.pictureUrl,
            accessToken: tokenData.access_token,
          },
        },
      },
    });

    const { accessToken } = this.issueTokens(user.id, email ?? '', UserRole.retailer, res);
    return {
      redirectUrl: `${frontendUrl}/auth/callback?token=${accessToken}&role=retailer&redirect=${encodeURIComponent('/retailer/onboarding')}&new=1`,
    };
  }

  async changePassword(
    userId: bigint,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '此帳號使用第三方登入，無法設定密碼',
      });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '目前密碼輸入錯誤',
      });
    }
    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }

  private issueTokens(id: bigint, email: string, role: UserRole, res: Response): AuthResult {
    const sub = id.toString();
    const payload: JwtPayload = { sub, email, role };

    const accessToken = this.signAccessToken(sub, email, role);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());

    return { user: { id: sub, email, role }, accessToken };
  }

  private signAccessToken(sub: string, email: string, role: UserRole): string {
    const payload: JwtPayload = { sub, email, role };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }
}
