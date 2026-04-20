import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { RecommendationsService, SearchResponse } from './recommendations.service'

type MulterFile = { buffer: Buffer; mimetype: string; originalname: string }

class TextSearchDto {
  @IsString()
  query!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number

  @IsOptional()
  @IsString()
  category?: string
}

@ApiTags('recommendations')
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get('for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得個人化推薦商品（零售商）' })
  async getForYou(
    @Req() req: Request & { user: JwtPayload },
    @Query('limit') limit = '12',
  ): Promise<object> {
    if (req.user.role !== UserRole.retailer) throw new ForbiddenException()
    const data = await this.service.getForUser(
      req.user.sub,
      Math.min(50, Math.max(1, parseInt(limit, 10))),
    )
    return { success: true, data }
  }

  @Post('search/text')
  @ApiOperation({ summary: '以文字語意搜尋商品（CLIP）' })
  async searchByText(@Body() dto: TextSearchDto): Promise<object> {
    const data = await this.service.searchByText(dto.query, dto.limit ?? 12, dto.category)
    return { success: true, data }
  }

  @Post('search/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '以圖片搜尋相似商品（CLIP 視覺搜尋）' })
  async searchByImage(
    @UploadedFile() file: MulterFile,
    @Query('limit') limit = '12',
    @Query('category') category?: string,
  ): Promise<object> {
    const data = await this.service.searchByImage(
      file.buffer,
      file.mimetype,
      file.originalname,
      Math.min(50, Math.max(1, parseInt(limit, 10))),
      category,
    )
    return { success: true, data }
  }
}
