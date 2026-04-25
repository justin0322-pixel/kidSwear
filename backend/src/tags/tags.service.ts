import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByShop(shopId: bigint) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, deletedAt: null },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商城不存在' });

    const tags = await this.prisma.tag.findMany({
      where: { OR: [{ shopId }, { shopId: null }] },
      orderBy: [{ shopId: 'asc' }, { usageCount: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, color: true, usageCount: true, shopId: true },
    });

    return tags.map((t) => ({
      ...t,
      id: t.id.toString(),
      shopId: t.shopId?.toString() ?? null,
    }));
  }

  async create(userId: bigint, dto: CreateTagDto) {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: true },
    });
    if (!wholesaler?.shop) throw new ForbiddenException();

    const tag = await this.prisma.tag.create({
      data: {
        shopId: wholesaler.shop.id,
        name: dto.name,
        category: dto.category,
        color: dto.color,
      },
      select: { id: true, name: true, category: true, color: true, usageCount: true, shopId: true },
    });

    return { ...tag, id: tag.id.toString(), shopId: tag.shopId?.toString() ?? null };
  }

  async remove(userId: bigint, tagId: bigint): Promise<void> {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: true },
    });
    if (!wholesaler?.shop) throw new ForbiddenException();

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, shopId: wholesaler.shop.id },
      select: { id: true },
    });
    if (!tag) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '標籤不存在' });

    await this.prisma.tag.delete({ where: { id: tagId } });
  }
}
