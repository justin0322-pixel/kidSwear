import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { UserRole } from '@prisma/client'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtPayload } from './interfaces/jwt-payload.interface'
import { UsersService } from '../users/users.service'

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) shopName?: string
  @IsOptional() @IsString() @MaxLength(50) contactPerson?: string
  @IsOptional() @IsString() shippingAddress?: string
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '帳密註冊' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<object> {
    const data = await this.authService.register(dto, res)
    return { success: true, data }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '帳密登入' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<object> {
    const data = await this.authService.login(dto, res)
    return { success: true, data }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Access Token' })
  async refresh(@Req() req: Request): Promise<object> {
    const data = await this.authService.refresh(req)
    return { success: true, data }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出' })
  logout(@Res({ passthrough: true }) res: Response): object {
    this.authService.logout(res)
    return { success: true, data: null }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得當前使用者' })
  async getMe(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    const data = await this.authService.me(req.user.sub)
    return { success: true, data }
  }

  @Get('line')
  @ApiOperation({ summary: 'LINE OAuth 授權跳轉' })
  lineLogin(@Res() res: Response): void {
    const state = Math.random().toString(36).slice(2)
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 })
    res.redirect(this.authService.getLineAuthUrl(state))
  }

  @Get('line/callback')
  @ApiOperation({ summary: 'LINE OAuth 回呼處理' })
  async lineCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookieState = (req.cookies as Record<string, string | undefined>)['oauth_state']
    res.clearCookie('oauth_state')
    if (!code || state !== cookieState) {
      res.redirect(
        `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login?error=oauth_failed`,
      )
      return
    }
    const { redirectUrl } = await this.authService.lineOAuthExchange(code, res)
    res.redirect(redirectUrl)
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新零售商個人資料' })
  async updateProfile(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.retailer) throw new ForbiddenException()
    const data = await this.usersService.updateRetailerProfile(BigInt(req.user.sub), dto)
    return { success: true, data }
  }
}
