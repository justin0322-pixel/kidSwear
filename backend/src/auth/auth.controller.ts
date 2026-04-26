import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OauthProvider, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { LineNotifyService } from '../notifications/line-notify.service';

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) shopName?: string;
  @IsOptional() @IsString() @MaxLength(50) contactPerson?: string;
  @IsOptional() @IsString() shippingAddress?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(8, { message: '新密碼至少 8 個字元' }) newPassword!: string;
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly lineNotify: LineNotifyService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '帳密註冊' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<object> {
    const data = await this.authService.register(dto, res);
    return { success: true, data };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '帳密登入' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<object> {
    const data = await this.authService.login(dto, res);
    return { success: true, data };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Access Token' })
  async refresh(@Req() req: Request): Promise<object> {
    const data = await this.authService.refresh(req);
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出' })
  logout(@Res({ passthrough: true }) res: Response): object {
    this.authService.logout(res);
    return { success: true, data: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得當前使用者' })
  async getMe(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    const data = await this.authService.me(req.user.sub);
    return { success: true, data };
  }

  @Get('line')
  @ApiOperation({ summary: 'LINE OAuth 授權跳轉' })
  lineLogin(@Res() res: Response): void {
    const state = Math.random().toString(36).slice(2);
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
    res.redirect(this.authService.getLineAuthUrl(state));
  }

  @Get('line/bind')
  @ApiOperation({ summary: 'LINE OAuth 綁定起始（帶 token query param）' })
  lineBindStart(@Query('token') token: string, @Res() res: Response): void {
    try {
      const payload = this.authService.verifyAccessToken(token);
      const state = Math.random().toString(36).slice(2);
      res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.cookie('oauth_bind_user_id', payload.sub, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.redirect(this.authService.getLineAuthUrl(state));
    } catch {
      res.redirect(
        `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/retailer/profile?error=bind_failed`,
      );
    }
  }

  @Get('line/callback')
  @ApiOperation({ summary: 'LINE OAuth 回呼處理' })
  async lineCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const cookieState = cookies['oauth_state'];
    const bindUserId = cookies['oauth_bind_user_id'];
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_bind_user_id');
    if (!code || state !== cookieState) {
      res.redirect(
        `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login?error=oauth_failed`,
      );
      return;
    }
    if (bindUserId) {
      const { redirectUrl } = await this.authService.lineOAuthBind(code, BigInt(bindUserId));
      res.redirect(redirectUrl);
      return;
    }
    const { redirectUrl } = await this.authService.lineOAuthExchange(code, res);
    res.redirect(redirectUrl);
  }

  @Get('google')
  @ApiOperation({ summary: 'Google OAuth 授權跳轉' })
  googleLogin(@Res() res: Response): void {
    const state = Math.random().toString(36).slice(2);
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
    res.redirect(this.authService.getGoogleAuthUrl(state));
  }

  @Get('google/bind')
  @ApiOperation({ summary: 'Google OAuth 綁定起始（帶 token query param）' })
  googleBindStart(@Query('token') token: string, @Res() res: Response): void {
    try {
      const payload = this.authService.verifyAccessToken(token);
      const state = Math.random().toString(36).slice(2);
      res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.cookie('oauth_bind_user_id', payload.sub, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.redirect(this.authService.getGoogleAuthUrl(state));
    } catch {
      res.redirect(
        `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/retailer/profile?error=bind_failed`,
      );
    }
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth 回呼處理' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const cookieState = cookies['oauth_state'];
    const bindUserId = cookies['oauth_bind_user_id'];
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_bind_user_id');
    if (!code || state !== cookieState) {
      res.redirect(
        `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login?error=oauth_failed`,
      );
      return;
    }
    if (bindUserId) {
      const { redirectUrl } = await this.authService.googleOAuthBind(code, BigInt(bindUserId));
      res.redirect(redirectUrl);
      return;
    }
    const { redirectUrl } = await this.authService.googleOAuthExchange(code, res);
    res.redirect(redirectUrl);
  }

  @Get('oauth-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得已綁定的 OAuth 帳號' })
  async getOAuthAccounts(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    const data = await this.authService.getOAuthAccounts(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Delete('oauth-accounts/:provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解除 OAuth 帳號綁定' })
  async unlinkOAuthAccount(
    @Req() req: Request & { user: JwtPayload },
    @Param('provider') provider: string,
  ): Promise<object> {
    await this.authService.unlinkOAuthAccount(BigInt(req.user.sub), provider as OauthProvider);
    return { success: true, data: null };
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密碼' })
  async changePassword(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<object> {
    await this.authService.changePassword(
      BigInt(req.user.sub),
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, data: null };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新零售商個人資料' })
  async updateProfile(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.retailer) throw new ForbiddenException();
    const data = await this.usersService.updateRetailerProfile(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  // ── LINE Notify ────────────────────────────────────────────────────────────

  @Get('line-notify/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查詢 LINE Notify 綁定狀態（批發商）' })
  async getLineNotifyStatus(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const token = await this.lineNotify.getTokenByUserId(BigInt(req.user.sub));
    return { success: true, data: { bound: token !== null } };
  }

  @Get('line-notify/bind')
  @ApiOperation({ summary: 'LINE Notify 綁定起始（批發商，帶 token query param）' })
  lineNotifyBindStart(@Query('token') token: string, @Res() res: Response): void {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    try {
      const payload = this.authService.verifyAccessToken(token);
      const state = Math.random().toString(36).slice(2);
      res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.cookie('oauth_bind_user_id', payload.sub, { httpOnly: true, maxAge: 10 * 60 * 1000 });
      res.redirect(this.lineNotify.buildAuthUrl(state));
    } catch {
      res.redirect(`${frontendUrl}/wholesaler/profile?error=notify_bind_failed`);
    }
  }

  @Get('line-notify/callback')
  @ApiOperation({ summary: 'LINE Notify OAuth 回呼' })
  async lineNotifyCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const cookies = req.cookies as Record<string, string | undefined>;
    const cookieState = cookies['oauth_state'];
    const userId = cookies['oauth_bind_user_id'];
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_bind_user_id');

    if (!code || state !== cookieState || !userId) {
      res.redirect(`${frontendUrl}/wholesaler/profile?error=notify_bind_failed`);
      return;
    }

    try {
      await this.lineNotify.exchangeAndSave(BigInt(userId), code);
      res.redirect(`${frontendUrl}/wholesaler/profile?bound=line_notify`);
    } catch {
      res.redirect(`${frontendUrl}/wholesaler/profile?error=notify_bind_failed`);
    }
  }

  @Delete('line-notify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解除 LINE Notify 綁定（批發商）' })
  async unlinkLineNotify(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.lineNotify.unlink(BigInt(req.user.sub));
    return { success: true, data: null };
  }
}
