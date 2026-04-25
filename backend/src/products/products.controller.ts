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
  BadRequestException,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class AddVariantDto {
  @IsString() @MaxLength(20) size!: string;
  @IsString() @MaxLength(30) color!: string;
  @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @IsOptional() @IsString() price?: string;
}

class UpdateVariantDto {
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) stock?: number;
  @IsOptional() @IsString() price?: string;
}
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductStatus, UserRole } from '@prisma/client';
import { IsIn } from 'class-validator';

const TOGGLEABLE_STATUSES = ['active', 'draft'] as const;
type ToggleableStatus = (typeof TOGGLEABLE_STATUSES)[number];

class ToggleStatusDto {
  @IsIn(TOGGLEABLE_STATUSES as unknown as string[])
  status!: ToggleableStatus;
}
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  @ApiOperation({ summary: '商品全文搜尋（pg_trgm + tsvector）' })
  async search(
    @Query('q') q: string,
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<object> {
    if (!q?.trim())
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '請提供搜尋關鍵字' });
    const result = await this.productsService.fullTextSearch(
      q,
      shopId,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(50, parseInt(pageSize, 10)) : 20,
    );
    return {
      success: true,
      data: result.items,
      query: result.query,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '列出商品' })
  async findAll(
    @Query() query: QueryProductDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<object> {
    const retailerUserId = req.user?.role === 'retailer' ? BigInt(req.user.sub) : undefined;
    const result = await this.productsService.findAll(query, retailerUserId);
    const { items, total, page, pageSize, isVipOnly, isVipMember } = result;
    return {
      success: true,
      data: items,
      meta: { isVipOnly, isVipMember },
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '取得商品詳情' })
  async findById(
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<object> {
    const retailerUserId = req.user?.role === 'retailer' ? BigInt(req.user.sub) : undefined;
    const data = await this.productsService.findById(BigInt(id), retailerUserId);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '建立商品（批發商）' })
  async create(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateProductDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.productsService.create(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商品（批發商）' })
  async update(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.productsService.update(BigInt(req.user.sub), BigInt(id), dto);
    return { success: true, data };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '切換商品上架狀態（批發商）' })
  async toggleStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: ToggleStatusDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.productsService.toggleStatus(
      BigInt(req.user.sub),
      BigInt(id),
      dto.status as ProductStatus,
    );
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除商品（軟刪除，批發商）' })
  async remove(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string): Promise<void> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.productsService.remove(BigInt(req.user.sub), BigInt(id));
  }

  @Post(':id/variants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增商品規格（批發商）' })
  async addVariant(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: AddVariantDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.productsService.addVariant(BigInt(req.user.sub), BigInt(id), dto);
    return { success: true, data };
  }

  @Patch(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商品規格庫存／價格（批發商）' })
  async updateVariant(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.productsService.updateVariant(
      BigInt(req.user.sub),
      BigInt(id),
      BigInt(variantId),
      dto,
    );
    return { success: true, data };
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除商品規格（批發商）' })
  async removeVariant(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ): Promise<void> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.productsService.removeVariant(BigInt(req.user.sub), BigInt(id), BigInt(variantId));
  }
}
