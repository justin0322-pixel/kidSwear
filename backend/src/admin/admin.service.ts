import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(page: number, pageSize: number, role?: string) {
    const where = {
      deletedAt: null,
      ...(role && { role: role as never }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          wholesaler: { select: { companyName: true } },
          retailer: { select: { shopName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id.toString(),
        email: u.email,
        role: u.role,
        status: u.status,
        displayName: u.wholesaler?.companyName ?? u.retailer?.shopName ?? '-',
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async updateUserStatus(userId: bigint, status: UserStatus): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '使用者不存在' });
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
  }

  async listShops(page: number, pageSize: number) {
    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          _count: { select: { products: true } },
          wholesaler: { select: { companyName: true, user: { select: { email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: shops.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        slug: s.slug,
        isActive: s.isActive,
        productCount: s._count.products,
        ownerEmail: s.wholesaler?.user?.email ?? '-',
        companyName: s.wholesaler?.companyName ?? '-',
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async updateShopStatus(shopId: bigint, isActive: boolean): Promise<void> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, deletedAt: null },
    });
    if (!shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城不存在' });
    await this.prisma.shop.update({ where: { id: shopId }, data: { isActive } });
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      wholesalerCount,
      retailerCount,
      newUsersToday,
      totalOrders,
      pendingOrders,
      revenueAgg,
      activeShops,
      activeProducts,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, role: 'wholesaler' } }),
      this.prisma.user.count({ where: { deletedAt: null, role: 'retailer' } }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: ['paid', 'processing', 'shipped', 'completed'] } },
      }),
      this.prisma.shop.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.product.count({ where: { deletedAt: null, status: 'active' } }),
    ]);

    return {
      totalUsers,
      wholesalerCount,
      retailerCount,
      newUsersToday,
      totalOrders,
      pendingOrders,
      confirmedRevenue: revenueAgg._sum.total?.toString() ?? '0',
      activeShops,
      activeProducts,
    };
  }
}
