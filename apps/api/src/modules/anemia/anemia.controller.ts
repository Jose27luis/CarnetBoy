import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { todayInLima } from '../../common/clinical/record-meta';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import { CatalogVersionsService } from '../catalogs/catalog-versions.service';
import { ChildrenService } from '../children/children.service';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { FacilitiesService } from '../facilities/facilities.service';
import { AnemiaOverviewDto, HemoglobinTestDto, IronSupplyDto, RecordHemoglobinTestDto, RecordIronSupplyDto } from './anemia.dto';
import { HemoglobinService } from './hemoglobin.service';
import { IronService } from './iron.service';

@ApiTags('anemia')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller('children/:id')
export class AnemiaController {
  constructor(
    private readonly hemoglobin: HemoglobinService,
    private readonly iron: IronService,
    private readonly catalogs: CatalogVersionsService,
    private readonly children: ChildrenService,
    private readonly facilities: FacilitiesService,
  ) {}

  @Get('anemia')
  @ApiOperation({ summary: 'Dosajes de hemoglobina y entregas de hierro vigentes' })
  @ApiResponse({ status: 200, type: AnemiaOverviewDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async overview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnemiaOverviewDto> {
    const now = new Date();
    await this.children.basics(id);
    const [reference, facilityAltitude, tests, supplies] = await Promise.all([
      this.catalogs.versionInForce('HEMOGLOBIN_THRESHOLDS', todayInLima(now)),
      this.facilities.altitudeOf(facilityId),
      this.hemoglobin.list(user.id, id, now),
      this.iron.list(user.id, id, now),
    ]);

    return { thresholdsPublished: reference !== null, facilityAltitude, tests, supplies };
  }

  @Post('hemoglobin-tests')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Registra un dosaje ajustado por la altitud del establecimiento' })
  @ApiResponse({ status: 201, type: HemoglobinTestDto })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'THRESHOLDS_NOT_PUBLISHED o ALTITUDE_TABLE_INCOMPLETE' })
  recordTest(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordHemoglobinTestDto,
  ): Promise<HemoglobinTestDto> {
    return this.hemoglobin.record({ actor, facilityId, ip }, id, body, idempotencyKey);
  }

  @Post('iron-supplies')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Registra una entrega de hierro' })
  @ApiResponse({ status: 201, type: IronSupplyDto })
  recordSupply(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordIronSupplyDto,
  ): Promise<IronSupplyDto> {
    return this.iron.record({ actor, facilityId, ip }, id, body, idempotencyKey);
  }
}
