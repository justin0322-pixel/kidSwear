import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { UserRole } from '@prisma/client'

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '請輸入有效的 Email' })
  email!: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: '密碼至少 8 個字元' })
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密碼需包含至少一個大寫字母、一個小寫字母和一個數字',
  })
  password!: string

  @ApiProperty({ enum: UserRole, example: 'wholesaler' })
  @IsEnum(UserRole, { message: '角色必須是 wholesaler 或 retailer' })
  role!: UserRole

  @ApiProperty({ example: '王小明' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  contactPerson!: string

  @ApiPropertyOptional({ example: '可愛童裝批發' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string

  @ApiPropertyOptional({ example: '小熊寶貝童裝店' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shopName?: string

  @ApiPropertyOptional({ example: '台北市信義區松仁路 100 號' })
  @IsOptional()
  @IsString()
  shippingAddress?: string
}
