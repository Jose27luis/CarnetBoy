import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { DocumentQueryDto } from './dto/children.dto';
import { AdminLinkDto, RevokeLinkDto } from './dto/links.dto';
import { LinksService } from './links.service';

@ApiTags('children')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/links')
export class AdminLinksController {
  constructor(private readonly links: LinksService) {}

  @Get()
  @ApiOperation({ summary: 'Busca vínculos por DNI o CNV del niño, o por DNI del apoderado' })
  @ApiResponse({ status: 200, type: [AdminLinkDto] })
  search(@Query() query: DocumentQueryDto): Promise<AdminLinkDto[]> {
    return this.links.adminSearch(query.document);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoca el vínculo; si era el último activo, cierra las sesiones del apoderado' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'LINK_NOT_PENDING o VERSION_CONFLICT' })
  async revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevokeLinkDto,
    @ClientIp() ip: string,
  ): Promise<void> {
    await this.links.revoke(actor, id, body, ip);
  }
}
