import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  variantId!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  shopId!: number;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ example: '台北市信義區松仁路 100 號' })
  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;

  @ApiProperty({ example: '王小明' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  contactName!: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone!: string;

  @ApiPropertyOptional({ example: '希望週五前出貨' })
  @IsOptional()
  @IsString()
  retailerNote?: string;
}
