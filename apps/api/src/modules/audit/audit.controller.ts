import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import { AuditPageDto, AuditQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

const DEFAULT_PAGE_SIZE = 50;

@ApiTags('audit')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los eventos de auditoría, del más reciente al más antiguo' })
  @ApiResponse({ status: 200, type: AuditPageDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  list(@Query() query: AuditQueryDto): Promise<AuditPageDto> {
    return this.audit.list({
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
      ...(query.entity === undefined ? {} : { entity: query.entity }),
      ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
    });
  }
}
