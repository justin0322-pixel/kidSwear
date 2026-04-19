import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateTagDto {
  @ApiProperty({ example: '可愛' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string

  @ApiPropertyOptional({ example: '風格' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  category?: string

  @ApiPropertyOptional({ example: '#FFB6C1' })
  @IsOptional()
  @IsHexColor()
  color?: string
}
