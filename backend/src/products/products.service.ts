import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma, ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { QueryProductDto } from './dto/query-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)
  private readonly recommenderUrl: string

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.recommenderUrl = config.get<string>('RECOMMENDER_URL') ?? 'http://localhost:8000'
  }

  private triggerEmbedTask(productId: bigint): void {
    fetch(`${this.recommenderUrl}/tasks/embed-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: Number(productId) }),
    }).catch((err: unknown) => {
      this.logger.warn(`embed-product task trigger failed for product ${productId}: ${String(err)}`)
    })
  }

  async fullTextSearch(q: string, shopId?: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize
    const term = q.trim()

    type RawRow = {
      id: bigint
      name: string
      category: string
      base_price: string
      shop_id: bigint
      shop_name: string
      primary_image_url: string | null
      rank: number
      headline: string
      total_count: bigint
    }

    const shopFilter = shopId ? Prisma.sql`AND p.shop_id = ${BigInt(shopId)}` : Prisma.sql``

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        p.id,
        p.name,
        p.category,
        p.base_price::text,
        p.shop_id,
        s.name AS shop_name,
        (
          SELECT pi.url FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        COALESCE(ts_rank(p.search_vector, plainto_tsquery('simple', ${term})), 0) +
          COALESCE(similarity(p.name, ${term}), 0) AS rank,
        COALESCE(
          ts_headline(
            'simple', p.name,
            plainto_tsquery('simple', ${term}),
            'StartSel=<<,StopSel=>>,MaxWords=8,MinWords=1'
          ),
          p.name
        ) AS headline,
        COUNT(*) OVER() AS total_count
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE
        p.deleted_at IS NULL
        AND p.status = 'active'
        AND (
          p.search_vector @@ plainto_tsquery('simple', ${term})
          OR p.name ILIKE ${'%' + term + '%'}
        )
        ${shopFilter}
      ORDER BY rank DESC, p.name
      LIMIT ${pageSize} OFFSET ${offset}
    `

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    return {
      items: rows.map((r) => ({
        id: r.id.toString(),
        name: r.name,
        headline: r.headline,
        category: r.category,
        basePrice: r.base_price,
        primaryImageUrl: r.primary_image_url,
        shop: { id: r.shop_id.toString(), name: r.shop_name },
        score: Math.min(1, Number(r.rank)),
      })),
      total,
      page,
      pageSize,
      query: term,
    }
  }

  async findAll(query: QueryProductDto, retailerUserId?: bigint) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '20', 10)))
    const tagNames = query.tags
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    // VIP 商城存取控制：只有在指定 shopId 時才需要檢查
    let isVipMember = false
    let vipDiscountMap = new Map<string, { type: string; value: Prisma.Decimal }>()

    if (query.shopId) {
      const shopId = BigInt(query.shopId)
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, deletedAt: null },
        select: { isVipOnly: true },
      })

      if (shop?.isVipOnly) {
        // 需要確認零售商身份
        if (retailerUserId) {
          const retailer = await this.prisma.retailer.findUnique({ where: { userId: retailerUserId } })
          if (retailer) {
            const membership = await this.prisma.shopVipMember.findUnique({
              where: { shopId_retailerId: { shopId, retailerId: retailer.id } },
            })
            isVipMember = !!membership
          }
        }
        // 非 VIP 且是 VIP 商城 → 回傳空列表
        if (!isVipMember) {
          return { items: [], total: 0, page, pageSize, isVipOnly: true, isVipMember: false }
        }
      }

      // VIP 成員：載入折扣設定
      if (isVipMember) {
        const discounts = await this.prisma.variantVipDiscount.findMany({ where: { shopId } })
        vipDiscountMap = new Map(discounts.map((d) => [d.variantId.toString(), { type: d.discountType, value: d.discountValue }]))
      }
    }

    const includeInactive = query.includeInactive === 'true'
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status
        ? { status: query.status as ProductStatus }
        : includeInactive ? {} : { status: ProductStatus.active }),
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
          status: true,
          category: true,
          basePrice: true,
          images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
          productTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
          shop: { select: { id: true, name: true } },
          variants: {
            select: {
              id: true,
              size: true,
              color: true,
              priceOverride: true,
              stock: true,
              reservedStock: true,
              lowStockThreshold: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items: raw.map((p) => {
        const basePrice = p.basePrice
        // 若有 VIP 折扣，取最低 VIP 價作為展示基底價
        let displayBasePrice = basePrice
        if (vipDiscountMap.size > 0) {
          for (const v of p.variants) {
            const disc = vipDiscountMap.get(v.id.toString())
            if (disc) {
              const vipPrice = disc.type === 'percentage'
                ? basePrice.mul(new Prisma.Decimal(1).sub(disc.value.div(100)))
                : disc.value
              if (vipPrice.lessThan(displayBasePrice)) displayBasePrice = vipPrice
            }
          }
        }
        return {
          id: p.id.toString(),
          name: p.name,
          status: p.status,
          category: p.category,
          basePrice: basePrice.toString(),
          vipPrice: vipDiscountMap.size > 0 ? displayBasePrice.toDecimalPlaces(2).toString() : undefined,
          primaryImageUrl: p.images[0]?.url ?? null,
          tags: p.productTags.map((pt) => ({
            id: Number(pt.tag.id),
            name: pt.tag.name,
            color: pt.tag.color,
          })),
          shop: { id: p.shop.id.toString(), name: p.shop.name },
          lowStockCount: p.variants.filter(
            (v) => v.stock - v.reservedStock <= v.lowStockThreshold,
          ).length,
        }
      }),
      total,
      page,
      pageSize,
      isVipOnly: false,
      isVipMember,
    }
  }

  async findById(id: bigint, retailerUserId?: bigint) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
        productTags: { include: { tag: true } },
        shop: { select: { id: true, name: true, slug: true, isVipOnly: true } },
      },
    })
    if (!product) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商品不存在' })

    // VIP 折扣：確認零售商是否為此商城的 VIP 成員
    let vipDiscountMap = new Map<string, { type: string; value: Prisma.Decimal }>()
    if (retailerUserId) {
      const retailer = await this.prisma.retailer.findUnique({ where: { userId: retailerUserId } })
      if (retailer) {
        const membership = await this.prisma.shopVipMember.findUnique({
          where: { shopId_retailerId: { shopId: product.shopId, retailerId: retailer.id } },
        })
        if (membership) {
          const discounts = await this.prisma.variantVipDiscount.findMany({ where: { shopId: product.shopId } })
          vipDiscountMap = new Map(discounts.map((d) => [d.variantId.toString(), { type: d.discountType, value: d.discountValue }]))
        }
      }
    }

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
      isVipMember: vipDiscountMap.size > 0,
      images: product.images.map((img) => ({
        id: img.id.toString(),
        url: img.url,
        isPrimary: img.isPrimary,
        altText: img.altText,
      })),
      variants: product.variants.map((v) => {
        const basePrice = v.priceOverride ?? product.basePrice
        const disc = vipDiscountMap.get(v.id.toString())
        const vipPrice = disc
          ? (disc.type === 'percentage'
              ? basePrice.mul(new Prisma.Decimal(1).sub(disc.value.div(100))).toDecimalPlaces(2)
              : disc.value)
          : null
        return {
          id: v.id.toString(),
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: basePrice.toString(),
          vipPrice: vipPrice?.toString() ?? undefined,
          stock: v.stock,
        }
      }),
      tags: product.productTags.map((pt) => pt.tag.name),
      shop: {
        id: product.shop.id.toString(),
        name: product.shop.name,
        slug: product.shop.slug,
        isVipOnly: product.shop.isVipOnly,
      },
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

      if (dto.imageUrls?.length) {
        await tx.productImage.createMany({
          data: dto.imageUrls.map((url, i) => ({
            productId: product.id,
            url,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        })
      }

      return product.id
    })

    if (dto.imageUrls?.length) {
      this.triggerEmbedTask(productId)
    }

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

      if (dto.imageUrls !== undefined) {
        await tx.productImage.deleteMany({ where: { productId } })
        if (dto.imageUrls.length > 0) {
          await tx.productImage.createMany({
            data: dto.imageUrls.map((url, i) => ({
              productId,
              url,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          })
        }
      }
    })

    if (dto.imageUrls?.length) {
      this.triggerEmbedTask(productId)
    }

    return this.findById(productId)
  }

  async remove(userId: bigint, productId: bigint): Promise<void> {
    await this.verifyOwnership(userId, productId)
    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: ProductStatus.archived },
    })
  }

  async toggleStatus(userId: bigint, productId: bigint, status: ProductStatus): Promise<void> {
    await this.verifyOwnership(userId, productId)
    await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    })
  }

  async addVariant(
    userId: bigint,
    productId: bigint,
    dto: { size: string; color: string; stock: number; price?: string },
  ) {
    await this.verifyOwnership(userId, productId)
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: productId } })
    const skuBase = (product.skuPrefix ?? `P${productId}`).toUpperCase()
    const count = await this.prisma.productVariant.count({ where: { productId } })
    const sku = `${skuBase}-${dto.size}-${dto.color}-${count}`.toUpperCase().replace(/\s+/g, '')
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku,
        size: dto.size,
        color: dto.color,
        stock: dto.stock,
        priceOverride: dto.price ? new Prisma.Decimal(dto.price) : undefined,
      },
    })
    return {
      id: variant.id.toString(),
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: (variant.priceOverride ?? product.basePrice).toString(),
      stock: variant.stock,
    }
  }

  async updateVariant(
    userId: bigint,
    productId: bigint,
    variantId: bigint,
    dto: { stock?: number; price?: string },
  ) {
    await this.verifyOwnership(userId, productId)
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    })
    if (!variant) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '規格不存在' })

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.price !== undefined && { priceOverride: new Prisma.Decimal(dto.price) }),
      },
    })
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: productId } })
    return {
      id: updated.id.toString(),
      sku: updated.sku,
      size: updated.size,
      color: updated.color,
      price: (updated.priceOverride ?? product.basePrice).toString(),
      stock: updated.stock,
    }
  }

  async removeVariant(userId: bigint, productId: bigint, variantId: bigint): Promise<void> {
    await this.verifyOwnership(userId, productId)
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, reservedStock: true },
    })
    if (!variant) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '規格不存在' })
    if (variant.reservedStock > 0) {
      throw new ForbiddenException({ code: 'VARIANT_HAS_RESERVED_STOCK', message: '此規格有未出貨訂單，無法刪除' })
    }
    await this.prisma.productVariant.delete({ where: { id: variantId } })
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
