import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { CartService } from './cart.service'
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto'

@ApiTags('cart')
@Controller({ path: 'cart', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '取得購物車' })
  async getCart(@Req() req: Request & { user: JwtPayload }): Promise<object> {
    const data = await this.cartService.getCart(BigInt(req.user.sub))
    return { success: true, data }
  }

  @Post('items')
  @ApiOperation({ summary: '加入購物車' })
  async addItem(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: AddCartItemDto,
  ): Promise<object> {
    const data = await this.cartService.addItem(BigInt(req.user.sub), dto)
    return { success: true, data }
  }

  @Put('items/:variantId')
  @ApiOperation({ summary: '更新購物車項目數量' })
  async updateItem(
    @Req() req: Request & { user: JwtPayload },
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<object> {
    const data = await this.cartService.updateItem(BigInt(req.user.sub), parseInt(variantId, 10), dto.quantity)
    return { success: true, data }
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除購物車項目' })
  async removeItem(
    @Req() req: Request & { user: JwtPayload },
    @Param('variantId') variantId: string,
  ): Promise<object> {
    const data = await this.cartService.removeItem(BigInt(req.user.sub), parseInt(variantId, 10))
    return { success: true, data }
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '清空購物車' })
  async clearCart(@Req() req: Request & { user: JwtPayload }): Promise<void> {
    await this.cartService.clearCart(BigInt(req.user.sub))
  }
}
