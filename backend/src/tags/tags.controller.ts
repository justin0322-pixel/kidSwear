import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller({ path: 'tags', version: '1' })
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '建立標籤（批發商）' })
  async create(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateTagDto,
  ): Promise<object> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    const data = await this.tagsService.create(BigInt(req.user.sub), dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除標籤（批發商）' })
  async remove(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string): Promise<void> {
    if (req.user.role !== UserRole.wholesaler) throw new ForbiddenException();
    await this.tagsService.remove(BigInt(req.user.sub), BigInt(id));
  }
}
