import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '請輸入有效的 Email' })
  email!: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(1)
  password!: string
}
