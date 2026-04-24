import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { TagsService } from '../tags/tags.service'
import { UpdateShopDto } from './dto/update-shop.dto'
import { ShopsService } from './shops.service'

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
    const p = Math.max(1, parseInt(page, 10))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)))
    const { items, total } = await this.shopsService.findAll(p, ps, search)
    return {
      success: true,
      data: items,
      pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
    }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得自己的商城（批發商）' })
  async getMyShop(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.shopsService.findMyShop(BigInt(req.user.sub))
    return { success: true, data }
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得商城統計數據（批發商）' })
  async getMyStats(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.shopsService.getMyStats(BigInt(req.user.sub))
    return { success: true, data }
  }

  @Get('my/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得商城數據分析（批發商，過去 30 天）' })
  async getMyAnalytics(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.shopsService.getAnalytics(BigInt(req.user.sub))
    return { success: true, data }
  }

  @Put('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商城資訊（批發商）' })
  async updateMyShop(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateShopDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.shopsService.updateMyShop(BigInt(req.user.sub), dto)
    return { success: true, data }
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: '以 slug 取得商城詳情' })
  async findBySlug(@Param('slug') slug: string): Promise<object> {
    const data = await this.shopsService.findBySlug(slug)
    return { success: true, data }
  }

  @Get(':id/tags')
  @ApiOperation({ summary: '列出商城標籤（含全域標籤）' })
  async getShopTags(@Param('id') id: string): Promise<object> {
    const data = await this.tagsService.findByShop(BigInt(id))
    return { success: true, data }
  }

  @Get(':id')
  @ApiOperation({ summary: '取得商城詳情' })
  async findById(@Param('id') id: string): Promise<object> {
    const data = await this.shopsService.findById(BigInt(id))
    return { success: true, data }
  }
}
