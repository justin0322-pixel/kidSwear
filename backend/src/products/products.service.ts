import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { QueryProductDto } from './dto/query-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '20', 10)))
    const tagNames = query.tags
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      status: ProductStatus.active,
      ...(query.shopId && { shopId: BigInt(query.shopId) }),
      ...(query.category && { category: query.category }),
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.minPrice && { basePrice: { gte: new Prisma.Decimal(query.minPrice) } }),
      ...(query.maxPrice && { basePrice: { lte: new Prisma.Decimal(query.maxPrice) } }),
      ...(tagNames?.length && {
        productTags: { some: { tag: { name: { in: tagNames } } } },
      }),
    }

    const [raw, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          category: true,
          basePrice: true,
          images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
          productTags: { select: { tag: { select: { name: true } } } },
          shop: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items: raw.map((p) => ({
        id: p.id.toString(),
        name: p.name,
        category: p.category,
        basePrice: p.basePrice.toString(),
        primaryImageUrl: p.images[0]?.url ?? null,
        tags: p.productTags.map((pt) => pt.tag.name),
        shop: { id: p.shop.id.toString(), name: p.shop.name },
      })),
      total,
      page,
      pageSize,
    }
  }

  async findById(id: bigint) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
        productTags: { include: { tag: true } },
        shop: { select: { id: true, name: true } },
      },
    })
    if (!product) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商品不存在' })

    return {
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      ageRange: product.ageRange,
      gender: product.gender,
      basePrice: product.basePrice.toString(),
      suggestedRetailPrice: product.suggestedRetailPrice?.toString() ?? null,
      attributes: product.attributes,
      status: product.status,
      images: product.images.map((img) => ({
        id: img.id.toString(),
        url: img.url,
        isPrimary: img.isPrimary,
        altText: img.altText,
      })),
      variants: product.variants.map((v) => ({
        id: v.id.toString(),
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: (v.priceOverride ?? product.basePrice).toString(),
        stock: v.stock,
      })),
      tags: product.productTags.map((pt) => pt.tag.name),
      shop: { id: product.shop.id.toString(), name: product.shop.name },
    }
  }

  async create(userId: bigint, dto: CreateProductDto) {
    const shop = await this.getShopOrFail(userId)

    const productId = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId: shop.id,
          name: dto.name,
          description: dto.description,
          skuPrefix: dto.skuPrefix,
          category: dto.category,
          ageRange: dto.ageRange,
          gender: dto.gender,
          basePrice: new Prisma.Decimal(dto.basePrice),
          suggestedRetailPrice: dto.suggestedRetailPrice
            ? new Prisma.Decimal(dto.suggestedRetailPrice)
            : undefined,
          attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
          status: ProductStatus.active,
        },
      })

      const skuBase = (dto.skuPrefix ?? `P${product.id}`).toUpperCase()
      await tx.productVariant.createMany({
        data: dto.variants.map((v, i) => ({
          productId: product.id,
          sku: `${skuBase}-${v.size}-${v.color}-${i}`.toUpperCase().replace(/\s+/g, ''),
          size: v.size,
          color: v.color,
          stock: v.stock,
          priceOverride: v.priceOverride ? new Prisma.Decimal(v.priceOverride) : undefined,
        })),
      })

      if (dto.tags?.length) {
        await tx.productTag.createMany({
          data: dto.tags.map((tagId) => ({ productId: product.id, tagId: BigInt(tagId) })),
          skipDuplicates: true,
        })
      }

      return product.id
    })

    return this.findById(productId)
  }

  async update(userId: bigint, productId: bigint, dto: UpdateProductDto) {
    await this.verifyOwnership(userId, productId)

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.ageRange !== undefined && { ageRange: dto.ageRange }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.basePrice !== undefined && { basePrice: new Prisma.Decimal(dto.basePrice) }),
          ...(dto.suggestedRetailPrice !== undefined && {
            suggestedRetailPrice: new Prisma.Decimal(dto.suggestedRetailPrice),
          }),
          ...(dto.attributes !== undefined && { attributes: dto.attributes as Prisma.InputJsonValue }),
        },
      })

      if (dto.tags !== undefined) {
        await tx.productTag.deleteMany({ where: { productId } })
        if (dto.tags.length > 0) {
          await tx.productTag.createMany({
            data: dto.tags.map((tagId) => ({ productId, tagId: BigInt(tagId) })),
            skipDuplicates: true,
          })
        }
      }
    })

    return this.findById(productId)
  }

  async remove(userId: bigint, productId: bigint): Promise<void> {
    await this.verifyOwnership(userId, productId)
    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: ProductStatus.archived },
    })
  }

  private async getShopOrFail(userId: bigint) {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      include: { shop: true },
    })
    if (!wholesaler?.shop) throw new ForbiddenException()
    return wholesaler.shop
  }

  private async verifyOwnership(userId: bigint, productId: bigint): Promise<void> {
    const shop = await this.getShopOrFail(userId)
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId: shop.id, deletedAt: null },
      select: { id: true },
    })
    if (!product) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商品不存在' })
  }
}
