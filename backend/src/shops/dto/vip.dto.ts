import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { DiscountType } from '@prisma/client'

export class AddVipMemberDto {
  @IsEmail({}, { message: '請提供有效的 Email' })
  email!: string
}

export class SetVipDiscountDto {
  @IsEnum(DiscountType, { message: 'discountType 必須為 percentage 或 fixed' })
  discountType!: DiscountType

  @IsNumber({}, { message: 'discountValue 必須為數字' })
  @Min(0)
  @Type(() => Number)
  discountValue!: number

  @IsOptional()
  @IsString()
  variantId?: string
}
