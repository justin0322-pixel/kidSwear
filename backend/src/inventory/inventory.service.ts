import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { STOCK_LOW, StockLowEvent } from '../orders/events/order.events';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  // Track recently-alerted variants to avoid spamming (variant ID → last alert time)
  private readonly alertCooldown = new Map<string, number>();
  private readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Called after order create / complete with the affected variant IDs
  async checkVariants(variantIds: bigint[]): Promise<void> {
    if (variantIds.length === 0) return;

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            shop: {
              include: { wholesaler: { include: { user: { select: { id: true, email: true } } } } },
            },
          },
        },
      },
    });

    for (const v of variants) {
      const available = v.stock - v.reservedStock;
      if (available <= v.lowStockThreshold) {
        this.emitIfNotCoolingDown(v.id.toString(), {
          variantId: v.id.toString(),
          productName: v.product.name,
          sku: v.sku,
          availableStock: available,
          threshold: v.lowStockThreshold,
          wholesalerUserId: v.product.shop.wholesaler?.userId.toString() ?? '',
          wholesalerEmail: v.product.shop.wholesaler?.user.email ?? '',
        });
      }
    }
  }

  // Safety-net: full scan every hour
  @Cron(CronExpression.EVERY_HOUR)
  async scanAllLowStock(): Promise<void> {
    this.logger.log('Running scheduled low-stock scan...');

    const variants = await this.prisma.productVariant.findMany({
      where: {
        product: { status: 'active', deletedAt: null },
      },
      include: {
        product: {
          include: {
            shop: {
              include: { wholesaler: { include: { user: { select: { id: true, email: true } } } } },
            },
          },
        },
      },
    });

    let alertCount = 0;
    for (const v of variants) {
      const available = v.stock - v.reservedStock;
      if (available <= v.lowStockThreshold) {
        this.emitIfNotCoolingDown(v.id.toString(), {
          variantId: v.id.toString(),
          productName: v.product.name,
          sku: v.sku,
          availableStock: available,
          threshold: v.lowStockThreshold,
          wholesalerUserId: v.product.shop.wholesaler?.userId.toString() ?? '',
          wholesalerEmail: v.product.shop.wholesaler?.user.email ?? '',
        });
        alertCount++;
      }
    }

    if (alertCount > 0) {
      this.logger.warn(`Low-stock scan complete: ${alertCount} variant(s) below threshold`);
    }
  }

  private emitIfNotCoolingDown(variantId: string, payload: Omit<StockLowEvent, never>): void {
    const last = this.alertCooldown.get(variantId) ?? 0;
    if (Date.now() - last < this.COOLDOWN_MS) return;

    this.alertCooldown.set(variantId, Date.now());
    this.eventEmitter.emit(
      STOCK_LOW,
      new StockLowEvent(
        payload.variantId,
        payload.productName,
        payload.sku,
        payload.availableStock,
        payload.threshold,
        payload.wholesalerUserId,
        payload.wholesalerEmail,
      ),
    );
  }
}
