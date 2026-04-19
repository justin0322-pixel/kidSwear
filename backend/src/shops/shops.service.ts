import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateShopDto } from './dto/update-shop.dto'

const SHOP_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  bannerUrl: true,
  minOrderAmount: true,
  isActive: true,
  _count: { select: { products: true } },
} satisfies Prisma.ShopSelect

type ShopRow = Prisma.ShopGetPayload<{ select: typeof SHOP_SELECT }>

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number): Promise<{ items: ReturnType<ShopsService['format']>[]; total: number }> {
    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: { isActive: true, deletedAt: null },
        skip,
        take: pageSize,
        select: SHOP_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where: { isActive: true, deletedAt: null } }),
    ])
    return { items: items.map((s) => this.format(s)), total }
  }

  async findById(id: bigint): Promise<ReturnType<ShopsService['format']>> {
    const shop = await this.prisma.shop.findFirst({
      where: { id, deletedAt: null },
      select: SHOP_SELECT,
    })
    if (!shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城不存在' })
    return this.format(shop)
  }

  async findMyShop(userId: bigint): Promise<ReturnType<ShopsService['format']>> {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: { select: SHOP_SELECT } },
    })
    if (!wholesaler) throw new ForbiddenException()
    if (!wholesaler.shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城尚未建立' })
    return this.format(wholesaler.shop)
  }

  async updateMyShop(userId: bigint, dto: UpdateShopDto): Promise<ReturnType<ShopsService['format']>> {
    const wholesaler = await this.prisma.wholesaler.findUnique({ where: { userId } })
    if (!wholesaler) throw new ForbiddenException()

    const shop = await this.prisma.shop.findUnique({ where: { wholesalerId: wholesaler.id } })
    if (!shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城不存在' })

    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.minOrderAmount !== undefined && {
          minOrderAmount: new Prisma.Decimal(dto.minOrderAmount),
        }),
      },
      select: SHOP_SELECT,
    })
    return this.format(updated)
  }

  private format(shop: ShopRow) {
    return {
      ...shop,
      id: shop.id.toString(),
      minOrderAmount: shop.minOrderAmount.toString(),
    }
  }
}
