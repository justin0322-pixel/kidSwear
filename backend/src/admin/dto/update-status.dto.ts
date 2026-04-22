import { IsEnum } from 'class-validator'
import { UserStatus } from '@prisma/client'

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus
}

export class UpdateShopStatusDto {
  @IsEnum(['active', 'inactive'])
  status!: 'active' | 'inactive'
}
