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
