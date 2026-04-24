import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDecimal, IsNumberString, IsOptional, IsString } from 'class-validator'

export class QueryProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  shopId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional({ description: '逗號分隔標籤名稱，例: 可愛,卡通' })
  @IsOptional()
  @IsString()
  tags?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  minPrice?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  maxPrice?: string

  @ApiPropertyOptional({ default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string

  @ApiPropertyOptional({ default: '20' })
  @IsOptional()
  @IsNumberString()
  pageSize?: string

  @ApiPropertyOptional({ description: '設為 true 時回傳所有狀態（批發商自己的商品）' })
  @IsOptional()
  @IsString()
  includeInactive?: string
}
