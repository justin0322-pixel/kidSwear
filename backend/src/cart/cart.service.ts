import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Redis } from 'ioredis'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_CLIENT } from '../redis/redis.module'
import { AddCartItemDto } from './dto/cart-item.dto'

const cartKey = (userId: bigint) => `cart:${userId}`

@Injectable()
export class CartService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  async getCart(userId: bigint) {
    const raw = await this.redis.hgetall(cartKey(userId))
    if (!Object.keys(raw).length) return { items: [], total: '0' }

    const variantIds = Object.keys(raw).map(BigInt)
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, name: true, basePrice: true, shopId: true } } },
    })

    const variantMap = new Map(variants.map((v) => [v.id.toString(), v]))
    let total = 0

    const items = Object.entries(raw).map(([variantId, qty]) => {
      const v = variantMap.get(variantId)
      if (!v) return null
      const price = Number((v.priceOverride ?? v.product.basePrice).toString())
      const quantity = parseInt(qty, 10)
      total += price * quantity
      return {
        variantId,
        productId: v.product.id.toString(),
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        unitPrice: (v.priceOverride ?? v.product.basePrice).toString(),
        quantity,
        subtotal: (price * quantity).toFixed(2),
      }
    }).filter(Boolean)

    return { items, total: total.toFixed(2) }
  }

  async addItem(userId: bigint, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: BigInt(dto.variantId) },
      select: { id: true },
    })
    if (!variant) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '商品規格不存在' })

    const key = cartKey(userId)
    const existing = await this.redis.hget(key, dto.variantId.toString())
    const newQty = (existing ? parseInt(existing, 10) : 0) + dto.quantity
    await this.redis.hset(key, dto.variantId.toString(), newQty)
    await this.redis.expire(key, 7 * 24 * 60 * 60)

    return this.getCart(userId)
  }

  async updateItem(userId: bigint, variantId: number, quantity: number) {
    const key = cartKey(userId)
    const exists = await this.redis.hexists(key, variantId.toString())
    if (!exists) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: '購物車中無此商品' })

    await this.redis.hset(key, variantId.toString(), quantity)
    return this.getCart(userId)
  }

  async removeItem(userId: bigint, variantId: number) {
    await this.redis.hdel(cartKey(userId), variantId.toString())
    return this.getCart(userId)
  }

  async clearCart(userId: bigint): Promise<void> {
    await this.redis.del(cartKey(userId))
  }
}
