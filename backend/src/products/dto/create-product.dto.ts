import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProductGender } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateVariantDto {
  @ApiProperty({ example: '80cm' })
  @IsString()
  @MaxLength(20)
  size!: string

  @ApiProperty({ example: '粉紅' })
  @IsString()
  @MaxLength(30)
  color!: string

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock!: number

  @ApiPropertyOptional({ example: '299.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  priceOverride?: string
}

export class CreateProductDto {
  @ApiProperty({ example: '可愛小熊上衣' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: 'BEAR' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  skuPrefix?: string

  @ApiProperty({ example: '上衣' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string

  @ApiPropertyOptional({ example: '3-6M' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ageRange?: string

  @ApiPropertyOptional({ enum: ProductGender })
  @IsOptional()
  @IsEnum(ProductGender)
  gender?: ProductGender

  @ApiProperty({ example: '250.00' })
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  basePrice!: string

  @ApiPropertyOptional({ example: '499.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  suggestedRetailPrice?: string

  @ApiPropertyOptional({ example: { material: '100% 純棉' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[]

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants!: CreateVariantDto[]
}
