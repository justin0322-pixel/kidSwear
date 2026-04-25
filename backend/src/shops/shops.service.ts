import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DiscountType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateShopDto } from './dto/update-shop.dto'
import { AddVipMemberDto, SetVipDiscountDto } from './dto/vip.dto'

const SHOP_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  bannerUrl: true,
  minOrderAmount: true,
  isActive: true,
  isVipOnly: true,
  _count: { select: { products: true } },
} satisfies Prisma.ShopSelect

type ShopRow = Prisma.ShopGetPayload<{ select: typeof SHOP_SELECT }>

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<{ items: ReturnType<ShopsService['format']>[]; total: number }> {
    const skip = (page - 1) * pageSize
    const where: Prisma.ShopWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    }
    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({ where, skip, take: pageSize, select: SHOP_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.shop.count({ where }),
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

  async findBySlug(slug: string): Promise<ReturnType<ShopsService['format']>> {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true, deletedAt: null },
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

  // ── VIP helpers ──────────────────────────────────────────────────────────

  private async getMyShopId(userId: bigint): Promise<bigint> {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: { select: { id: true } } },
    })
    if (!wholesaler?.shop) throw new ForbiddenException()
    return wholesaler.shop.id
  }

  async isVipMember(shopId: bigint, retailerId: bigint): Promise<boolean> {
    const record = await this.prisma.shopVipMember.findUnique({
      where: { shopId_retailerId: { shopId, retailerId } },
    })
    return !!record
  }

  async getVipDiscountsForRetailer(shopId: bigint): Promise<Map<string, { type: DiscountType; value: Prisma.Decimal }>> {
    const discounts = await this.prisma.variantVipDiscount.findMany({ where: { shopId } })
    return new Map(discounts.map((d) => [d.variantId.toString(), { type: d.discountType, value: d.discountValue }]))
  }

  async setVipMode(userId: bigint, isVipOnly: boolean): Promise<ReturnType<ShopsService['format']>> {
    const shopId = await this.getMyShopId(userId)
    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { isVipOnly },
      select: SHOP_SELECT,
    })
    return this.format(updated)
  }

  async listVipMembers(userId: bigint) {
    const shopId = await this.getMyShopId(userId)
    const members = await this.prisma.shopVipMember.findMany({
      where: { shopId },
      include: {
        retailer: {
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return members.map((m) => ({
      id: m.id.toString(),
      retailerId: m.retailer.id.toString(),
      shopName: m.retailer.shopName,
      email: m.retailer.user.email ?? '',
      createdAt: m.createdAt,
    }))
  }

  async addVipMember(userId: bigint, dto: AddVipMemberDto) {
    const shopId = await this.getMyShopId(userId)
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { retailer: true },
    })
    if (!user?.retailer) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '找不到此 Email 的零售商帳號' })
    }
    const existing = await this.prisma.shopVipMember.findUnique({
      where: { shopId_retailerId: { shopId, retailerId: user.retailer.id } },
    })
    if (existing) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '此零售商已是 VIP 成員' })
    }
    await this.prisma.shopVipMember.create({ data: { shopId, retailerId: user.retailer.id } })
    return { retailerId: user.retailer.id.toString(), shopName: user.retailer.shopName, email: user.email }
  }

  async removeVipMember(userId: bigint, retailerId: bigint) {
    const shopId = await this.getMyShopId(userId)
    const record = await this.prisma.shopVipMember.findUnique({
      where: { shopId_retailerId: { shopId, retailerId } },
    })
    if (!record) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'VIP 成員不存在' })
    await this.prisma.shopVipMember.delete({ where: { id: record.id } })
  }

  async listVipDiscounts(userId: bigint) {
    const shopId = await this.getMyShopId(userId)
    const discounts = await this.prisma.variantVipDiscount.findMany({
      where: { shopId },
      include: {
        variant: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return discounts.map((d) => ({
      id: d.id.toString(),
      variantId: d.variantId.toString(),
      productId: d.variant.product.id.toString(),
      productName: d.variant.product.name,
      size: d.variant.size,
      color: d.variant.color,
      discountType: d.discountType,
      discountValue: d.discountValue.toString(),
    }))
  }

  async setVipDiscount(userId: bigint, variantId: bigint, dto: SetVipDiscountDto) {
    const shopId = await this.getMyShopId(userId)
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId },
      include: { product: { select: { shopId: true, name: true } } },
    })
    if (!variant || variant.product.shopId !== shopId) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商品規格不存在或不屬於此商城' })
    }
    if (dto.discountType === DiscountType.percentage && (dto.discountValue < 0 || dto.discountValue > 100)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '百分比折扣須介於 0-100' })
    }
    const discount = await this.prisma.variantVipDiscount.upsert({
      where: { variantId_shopId: { variantId, shopId } },
      create: { variantId, shopId, discountType: dto.discountType, discountValue: new Prisma.Decimal(dto.discountValue) },
      update: { discountType: dto.discountType, discountValue: new Prisma.Decimal(dto.discountValue) },
    })
    return {
      id: discount.id.toString(),
      variantId: discount.variantId.toString(),
      discountType: discount.discountType,
      discountValue: discount.discountValue.toString(),
    }
  }

  async removeVipDiscount(userId: bigint, variantId: bigint) {
    const shopId = await this.getMyShopId(userId)
    const record = await this.prisma.variantVipDiscount.findUnique({
      where: { variantId_shopId: { variantId, shopId } },
    })
    if (!record) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'VIP 折扣設定不存在' })
    await this.prisma.variantVipDiscount.delete({ where: { id: record.id } })
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

  async getMyStats(userId: bigint): Promise<{ todayOrders: number; monthRevenue: string; productCount: number }> {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: { select: { id: true } } },
    })
    if (!wholesaler || !wholesaler.shop) throw new ForbiddenException()

    const shopId = wholesaler.shop.id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayOrders, monthRevenueResult, productCount] = await Promise.all([
      this.prisma.order.count({
        where: { shopId, createdAt: { gte: todayStart } },
      }),
      this.prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: monthStart },
          status: { in: ['paid', 'processing', 'shipped', 'completed'] },
        },
        _sum: { total: true },
      }),
      this.prisma.product.count({
        where: { shopId, deletedAt: null },
      }),
    ])

    return {
      todayOrders,
      monthRevenue: (monthRevenueResult._sum?.total ?? new Prisma.Decimal(0)).toString(),
      productCount,
    }
  }

  async getAnalytics(userId: bigint) {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: { select: { id: true } } },
    })
    if (!wholesaler?.shop) throw new ForbiddenException()

    const shopId = wholesaler.shop.id

    type RevenueRow = { date: Date; revenue: string; order_count: bigint }
    type TopProductRow = { id: string; name: string; order_count: bigint; total_quantity: bigint; revenue: string }
    type TopRetailerRow = { id: string; shop_name: string; order_count: bigint; total_amount: string }

    const [revenueByDay, topProducts, topRetailers, statusGroups] = await Promise.all([
      this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
        SELECT DATE(created_at) AS date,
               SUM(total)::text AS revenue,
               COUNT(*)        AS order_count
        FROM   orders
        WHERE  shop_id = ${shopId}
          AND  status NOT IN ('cancelled','refunded')
          AND  created_at >= NOW() - INTERVAL '30 days'
        GROUP  BY DATE(created_at)
        ORDER  BY date
      `),
      this.prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
        SELECT p.id::text,
               p.name,
               COUNT(DISTINCT oi.order_id) AS order_count,
               SUM(oi.quantity)            AS total_quantity,
               SUM(oi.subtotal)::text      AS revenue
        FROM   order_items oi
        JOIN   product_variants pv ON pv.id  = oi.variant_id
        JOIN   products p          ON p.id   = pv.product_id
        JOIN   orders   o          ON o.id   = oi.order_id
        WHERE  p.shop_id = ${shopId}
          AND  o.status NOT IN ('cancelled','refunded')
          AND  o.created_at >= NOW() - INTERVAL '30 days'
        GROUP  BY p.id, p.name
        ORDER  BY order_count DESC
        LIMIT  5
      `),
      this.prisma.$queryRaw<TopRetailerRow[]>(Prisma.sql`
        SELECT r.id::text,
               r.shop_name,
               COUNT(DISTINCT o.id) AS order_count,
               SUM(o.total)::text   AS total_amount
        FROM   orders o
        JOIN   retailers r ON r.id = o.retailer_id
        WHERE  o.shop_id = ${shopId}
          AND  o.status NOT IN ('cancelled','refunded')
          AND  o.created_at >= NOW() - INTERVAL '30 days'
        GROUP  BY r.id, r.shop_name
        ORDER  BY SUM(o.total) DESC
        LIMIT  5
      `),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { shopId },
        _count: { status: true },
      }),
    ])

    return {
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        revenue: r.revenue,
        orderCount: Number(r.order_count),
      })),
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        orderCount: Number(p.order_count),
        totalQuantity: Number(p.total_quantity),
        revenue: p.revenue,
      })),
      topRetailers: topRetailers.map((r) => ({
        id: r.id,
        shopName: r.shop_name,
        orderCount: Number(r.order_count),
        totalAmount: r.total_amount,
      })),
      orderStatusCounts: Object.fromEntries(
        statusGroups.map((g) => [g.status, g._count.status]),
      ),
    }
  }

  private format(shop: ShopRow) {
    return {
      ...shop,
      id: shop.id.toString(),
      minOrderAmount: shop.minOrderAmount.toString(),
    }
  }
}
