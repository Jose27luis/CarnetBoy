import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import {
  AddAppointmentIntervalDto,
  AddHemoglobinThresholdDto,
  AddScheduledDoseDto,
  CatalogListQueryDto,
  CatalogVersionDetailDto,
  CatalogVersionDto,
  CreateCatalogVersionDto,
  PublishCatalogVersionDto,
  RemoveEntryDto,
  UpdateNormDto,
} from './catalogs.dto';
import { CatalogVersionsService } from './catalog-versions.service';

@ApiTags('catalogs')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/catalogs')
export class CatalogVersionsController {
  constructor(private readonly versions: CatalogVersionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las versiones de un catálogo' })
  @ApiResponse({ status: 200, type: [CatalogVersionDto] })
  list(@Query() query: CatalogListQueryDto): Promise<CatalogVersionDto[]> {
    return this.versions.list(query.kind);
  }

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Crea un borrador, vacío o copiado de otra versión' })
  @ApiResponse({ status: 201, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'La versión de origen no existe' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'IDEMPOTENCY_KEY_REUSED' })
  @ApiResponse({ status: 428, type: ApiErrorDto, description: 'IDEMPOTENCY_KEY_REQUIRED' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateCatalogVersionDto,
    @IdempotencyKey() idempotencyKey: string,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    return this.versions.create(actor, body, idempotencyKey, ip);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Muestra una versión con todas sus entradas' })
  @ApiResponse({ status: 200, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<CatalogVersionDetailDto> {
    return this.versions.detail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cambia la norma de origen de un borrador' })
  @ApiResponse({ status: 200, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  updateNorm(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateNormDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    return this.versions.updateNorm(actor, id, body.norm, body.expectedVersion, ip);
  }

  @Post(':id/doses')
  @ApiOperation({ summary: 'Agrega una dosis al borrador de un esquema de vacunación' })
  @ApiResponse({ status: 201, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_ENTRY_DUPLICATED, CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  addDose(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddScheduledDoseDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    const { expectedVersion, ...dose } = body;

    return this.versions.addDose(actor, id, dose, expectedVersion, ip);
  }

  @Post(':id/hemoglobin-thresholds')
  @ApiOperation({ summary: 'Agrega un umbral de hemoglobina por rango de edad al borrador' })
  @ApiResponse({ status: 201, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_RANGE_OVERLAP, CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  addThreshold(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddHemoglobinThresholdDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    const { expectedVersion, ...threshold } = body;

    return this.versions.addThreshold(actor, id, threshold, expectedVersion, ip);
  }

  @Post(':id/appointment-intervals')
  @ApiOperation({ summary: 'Agrega un intervalo entre citas por tipo y rango de edad al borrador' })
  @ApiResponse({ status: 201, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_RANGE_OVERLAP, CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  addInterval(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddAppointmentIntervalDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    const { expectedVersion, ...interval } = body;

    return this.versions.addInterval(actor, id, interval, expectedVersion, ip);
  }

  @Post(':id/entries/:entryId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quita una entrada del borrador' })
  @ApiResponse({ status: 200, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  removeEntry(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() body: RemoveEntryDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    return this.versions.removeEntry(actor, id, entryId, body.expectedVersion, ip);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica el borrador y cierra la vigencia de la versión anterior' })
  @ApiResponse({ status: 200, type: CatalogVersionDetailDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CATALOG_NOT_DRAFT o VERSION_CONFLICT' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'CATALOG_EMPTY o VALIDITY_NOT_AFTER_CURRENT' })
  publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PublishCatalogVersionDto,
    @ClientIp() ip: string,
  ): Promise<CatalogVersionDetailDto> {
    return this.versions.publish(actor, id, body.validFrom, body.expectedVersion, ip);
  }
}
