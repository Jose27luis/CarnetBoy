import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import {
  CorrectionOutcomeDto,
  CorrectionRequestDto,
  CorrectionStatusQueryDto,
  PendingCorrectionDto,
  RecordParamsDto,
  RejectCorrectionDto,
  RequestCorrectionDto,
} from './corrections.dto';
import { CorrectionsService } from './corrections.service';

@ApiTags('corrections')
@ApiBearerAuth()
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller()
export class CorrectionsController {
  constructor(private readonly corrections: CorrectionsService) {}

  @Post('records/:type/:id/corrections')
  @RequireRoles('DIGITIZER')
  @ApiOperation({ summary: 'Corrige un registro propio de menos de 72 horas o pide la aprobación del admin' })
  @ApiResponse({ status: 201, type: CorrectionOutcomeDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'RECORD_NOT_CURRENT o CORRECTION_ALREADY_REQUESTED' })
  request(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() params: RecordParamsDto,
    @Body() body: RequestCorrectionDto,
    @ClientIp() ip: string,
  ): Promise<CorrectionOutcomeDto> {
    return this.corrections.request(actor, params.type, params.id, body, ip);
  }

  @Get('children/:id/corrections')
  @RequireRoles('DIGITIZER')
  @ApiOperation({ summary: 'Correcciones pendientes de aprobación de los registros del niño' })
  @ApiResponse({ status: 200, type: [PendingCorrectionDto] })
  pending(@Param('id', ParseUUIDPipe) id: string): Promise<PendingCorrectionDto[]> {
    return this.corrections.pendingForChild(id);
  }

  @Get('admin/corrections')
  @RequireRoles('ADMIN')
  @ApiOperation({ summary: 'Solicitudes de corrección por estado' })
  @ApiResponse({ status: 200, type: [CorrectionRequestDto] })
  list(@Query() query: CorrectionStatusQueryDto): Promise<CorrectionRequestDto[]> {
    return this.corrections.list(query.status);
  }

  @Post('admin/corrections/:id/approve')
  @RequireRoles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Aprueba la corrección: crea la versión nueva y recalcula los derivados' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CORRECTION_NOT_PENDING o RECORD_NOT_CURRENT' })
  async approve(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @ClientIp() ip: string): Promise<void> {
    await this.corrections.approve(actor, id, ip);
  }

  @Post('admin/corrections/:id/reject')
  @RequireRoles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rechaza la corrección; el registro original sigue vigente' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CORRECTION_NOT_PENDING' })
  async reject(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectCorrectionDto,
    @ClientIp() ip: string,
  ): Promise<void> {
    await this.corrections.reject(actor, id, body.reason, ip);
  }
}
