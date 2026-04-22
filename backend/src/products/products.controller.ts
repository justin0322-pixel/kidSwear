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
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { CreateProductDto } from './dto/create-product.dto'
import { QueryProductDto } from './dto/query-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

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
    if (!q?.trim()) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '請提供搜尋關鍵字' })
    const result = await this.productsService.fullTextSearch(
      q,
      shopId,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(50, parseInt(pageSize, 10)) : 20,
    )
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
    }
  }

  @Get()
  @ApiOperation({ summary: '列出商品' })
  async findAll(@Query() query: QueryProductDto): Promise<object> {
    const { items, total, page, pageSize } = await this.productsService.findAll(query)
    return {
      success: true,
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '取得商品詳情' })
  async findById(@Param('id') id: string): Promise<object> {
    const data = await this.productsService.findById(BigInt(id))
    return { success: true, data }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '建立商品（批發商）' })
  async create(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateProductDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.productsService.create(BigInt(req.user.sub), dto)
    return { success: true, data }
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
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    const data = await this.productsService.update(BigInt(req.user.sub), BigInt(id), dto)
    return { success: true, data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除商品（軟刪除，批發商）' })
  async remove(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ): Promise<void> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException()
    await this.productsService.remove(BigInt(req.user.sub), BigInt(id))
  }
}
