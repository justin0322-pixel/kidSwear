import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateTrackingDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @MaxLength(100)
  trackingNumber!: string;
}
