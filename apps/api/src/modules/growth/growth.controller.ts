import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { GrowthBands } from '@carnet/contracts';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import { ChildrenService } from '../children/children.service';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { bandsFor } from './growth-bands';
import { GrowthCheckDto, RecordGrowthCheckDto } from './growth.dto';
import { GrowthService } from './growth.service';

@ApiTags('growth')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller('children/:id/growth-checks')
export class GrowthController {
  constructor(
    private readonly growth: GrowthService,
    private readonly children: ChildrenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Controles de crecimiento vigentes, del más reciente al más antiguo' })
  @ApiResponse({ status: 200, type: [GrowthCheckDto] })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  list(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<GrowthCheckDto[]> {
    return this.growth.list(user.id, id);
  }

  @Get('bands')
  @ApiOperation({ summary: 'Bandas de la OMS para dibujar las curvas del niño (z de -3 a +3)' })
  @ApiOkResponse({ description: 'Peso, talla y perímetro cefálico para la edad, por día' })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async bands(@Param('id', ParseUUIDPipe) id: string): Promise<GrowthBands> {
    const child = await this.children.basics(id);

    return bandsFor(child.sex, child.birthDate, new Date());
  }

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Registra un control con puntajes Z de la OMS 2006' })
  @ApiResponse({ status: 201, type: GrowthCheckDto })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'MEASUREMENT_NEEDS_CONFIRMATION' })
  record(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordGrowthCheckDto,
  ): Promise<GrowthCheckDto> {
    return this.growth.record({ actor, facilityId, ip }, id, body, idempotencyKey);
  }
}
