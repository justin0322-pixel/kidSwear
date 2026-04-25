import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '建立訂單（零售商）' })
  async create(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateOrderDto,
  ): Promise<object> {
    const data = await this.ordersService.create(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: '列出訂單（角色分流）' })
  async findAll(
    @Req() req: Request & { user: JwtPayload },
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
  ): Promise<object> {
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const { items, total } = await this.ordersService.findAll(
      BigInt(req.user.sub),
      req.user.role,
      status,
      p,
      ps,
      search,
    );
    return {
      success: true,
      data: items,
      pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '取得訂單詳情' })
  async findById(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ): Promise<object> {
    const data = await this.ordersService.findById(BigInt(req.user.sub), req.user.role, BigInt(id));
    return { success: true, data };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新訂單狀態（批發商）' })
  async updateStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<object> {
    const data = await this.ordersService.updateStatus(BigInt(req.user.sub), BigInt(id), dto);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消訂單（零售商，僅 pending）' })
  async cancel(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ): Promise<object> {
    const data = await this.ordersService.cancel(BigInt(req.user.sub), BigInt(id));
    return { success: true, data };
  }
}
