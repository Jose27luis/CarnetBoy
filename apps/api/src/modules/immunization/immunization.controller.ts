import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { AdministeredDoseDto, ImmunizationStatusDto, RecordDoseDto } from './immunization.dto';
import { ImmunizationService } from './immunization.service';

@ApiTags('immunization')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller('children/:id')
export class ImmunizationController {
  constructor(private readonly immunization: ImmunizationService) {}

  @Get('immunization')
  @ApiOperation({ summary: 'Dosis del esquema vigente al nacimiento, con su estado' })
  @ApiResponse({ status: 200, type: ImmunizationStatusDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  status(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImmunizationStatusDto> {
    return this.immunization.status(user.id, facilityId, id);
  }

  @Post('doses')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Registra una dosis aplicada' })
  @ApiResponse({ status: 201, type: AdministeredDoseDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'DOSE_ALREADY_RECORDED' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'SCHEDULE_NOT_PUBLISHED o DOSE_OUT_OF_RANGE' })
  record(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordDoseDto,
  ): Promise<AdministeredDoseDto> {
    return this.immunization.record({ actor, facilityId, ip }, id, body, idempotencyKey);
  }
}
