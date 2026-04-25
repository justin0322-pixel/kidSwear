import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TagsService } from '../tags/tags.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AddVipMemberDto, SetVipDiscountDto } from './dto/vip.dto';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller({ path: 'shops', version: '1' })
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '列出所有商城' })
  async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
  ): Promise<object> {
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const { items, total } = await this.shopsService.findAll(p, ps, search);
    return {
      success: true,
      data: items,
      pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得自己的商城（批發商）' })
  async getMyShop(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.findMyShop(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得商城統計數據（批發商）' })
  async getMyStats(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.getMyStats(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Get('my/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得商城數據分析（批發商，過去 30 天）' })
  async getMyAnalytics(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.getAnalytics(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Put('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商城資訊（批發商）' })
  async updateMyShop(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateShopDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.updateMyShop(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: '以 slug 取得商城詳情' })
  async findBySlug(@Param('slug') slug: string): Promise<object> {
    const data = await this.shopsService.findBySlug(slug);
    return { success: true, data };
  }

  // ── VIP 模式切換 ─────────────────────────────────────────────────────────

  @Patch('my/vip-mode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '切換 VIP 商城模式（批發商）' })
  async setVipMode(
    @Req() req: Request & { user: JwtPayload },
    @Body('isVipOnly') isVipOnly: boolean,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.setVipMode(BigInt(req.user.sub), isVipOnly);
    return { success: true, data };
  }

  // ── VIP 成員管理 ──────────────────────────────────────────────────────────

  @Get('my/vip-members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '列出 VIP 成員（批發商）' })
  async listVipMembers(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.listVipMembers(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Post('my/vip-members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增 VIP 成員（批發商）' })
  async addVipMember(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: AddVipMemberDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.addVipMember(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  @Delete('my/vip-members/:retailerId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除 VIP 成員（批發商）' })
  async removeVipMember(
    @Req() req: Request & { user: JwtPayload },
    @Param('retailerId') retailerId: string,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.shopsService.removeVipMember(BigInt(req.user.sub), BigInt(retailerId));
    return { success: true, data: null };
  }

  // ── VIP 折扣管理 ──────────────────────────────────────────────────────────

  @Get('my/vip-discounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '列出 VIP 折扣設定（批發商）' })
  async listVipDiscounts(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.listVipDiscounts(BigInt(req.user.sub));
    return { success: true, data };
  }

  @Put('my/variants/:variantId/vip-discount')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '設定 VIP 折扣（批發商）' })
  async setVipDiscount(
    @Req() req: Request & { user: JwtPayload },
    @Param('variantId') variantId: string,
    @Body() dto: SetVipDiscountDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.shopsService.setVipDiscount(
      BigInt(req.user.sub),
      BigInt(variantId),
      dto,
    );
    return { success: true, data };
  }

  @Delete('my/variants/:variantId/vip-discount')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除 VIP 折扣設定（批發商）' })
  async removeVipDiscount(
    @Req() req: Request & { user: JwtPayload },
    @Param('variantId') variantId: string,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.shopsService.removeVipDiscount(BigInt(req.user.sub), BigInt(variantId));
    return { success: true, data: null };
  }

  @Get(':id/tags')
  @ApiOperation({ summary: '列出商城標籤（含全域標籤）' })
  async getShopTags(@Param('id') id: string): Promise<object> {
    const data = await this.tagsService.findByShop(BigInt(id));
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: '取得商城詳情' })
  async findById(@Param('id') id: string): Promise<object> {
    const data = await this.shopsService.findById(BigInt(id));
    return { success: true, data };
  }
}
