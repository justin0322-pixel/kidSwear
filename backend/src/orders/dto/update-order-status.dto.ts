import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

const WHOLESALER_STATUSES = [
  OrderStatus.paid,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.completed,
  OrderStatus.refunded,
] as const

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: WHOLESALER_STATUSES })
  @IsEnum(WHOLESALER_STATUSES)
  status!: (typeof WHOLESALER_STATUSES)[number]

  @ApiPropertyOptional({ example: '已透過黑貓宅急便出貨' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string
}
