import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  variantId!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
