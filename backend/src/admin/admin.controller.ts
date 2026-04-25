import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminService } from './admin.service';
import { UpdateShopStatusDto, UpdateUserStatusDto } from './dto/update-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private assertAdmin(req: Request & { user: JwtPayload }): void {
    if (req.user.role !== UserRole.admin) throw new ForbiddenException();
  }

  @Get('stats')
  @ApiOperation({ summary: '系統統計數據（管理員）' })
  async getStats(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    this.assertAdmin(req);
    const data = await this.adminService.getStats();
    return { success: true, data };
  }

  @Get('users')
  @ApiOperation({ summary: '取得使用者列表' })
  async listUsers(
    @Req() req: Request & { user: JwtPayload },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('role') role?: string,
  ): Promise<object> {
    this.assertAdmin(req);
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const data = await this.adminService.listUsers(p, ps, role);
    return { success: true, data };
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新使用者狀態（停權/啟用）' })
  async updateUserStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<object> {
    this.assertAdmin(req);
    await this.adminService.updateUserStatus(BigInt(id), dto.status as UserStatus);
    return { success: true, data: null };
  }

  @Get('shops')
  @ApiOperation({ summary: '取得所有商城（含未啟用）' })
  async listShops(
    @Req() req: Request & { user: JwtPayload },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<object> {
    this.assertAdmin(req);
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const data = await this.adminService.listShops(p, ps);
    return { success: true, data };
  }

  @Patch('shops/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '啟用/停用商城' })
  async updateShopStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShopStatusDto,
  ): Promise<object> {
    this.assertAdmin(req);
    await this.adminService.updateShopStatus(BigInt(id), dto.status === 'active');
    return { success: true, data: null };
  }
}
