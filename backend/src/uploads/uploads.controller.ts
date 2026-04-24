import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsIn, IsString, MaxLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UploadsService } from './uploads.service'

class PresignDto {
  @IsString()
  @MaxLength(200)
  filename!: string

  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  contentType!: string
}

@ApiTags('uploads')
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得圖片上傳 presigned URL（批發商）' })
  async presign(@Body() dto: PresignDto): Promise<object> {
    try {
      const result = await this.uploads.createPresignedUpload(dto.filename, dto.contentType)
      return { success: true, data: result }
    } catch (err) {
      throw new BadRequestException({ code: 'UPLOAD_ERROR', message: String(err) })
    }
  }
}
