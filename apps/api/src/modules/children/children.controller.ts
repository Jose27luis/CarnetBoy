import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import { SENSITIVE_THROTTLE } from '../../infrastructure/throttling/throttling.module';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { ChildrenService } from './children.service';
import {
  ChildRecordDto,
  DocumentQueryDto,
  FacilityChildrenDto,
  FacilityChildrenQueryDto,
  RegisterChildDto,
  SearchResultDto,
  UpdateChildDto,
} from './dto/children.dto';
import { CreateLinkDto, LinkCreatedDto } from './dto/links.dto';
import { LinksService } from './links.service';

@ApiTags('children')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller('children')
export class ChildrenController {
  constructor(
    private readonly children: ChildrenService,
    private readonly links: LinksService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Niños registrados en el establecimiento elegido, con filtro opcional por nombre' })
  @ApiResponse({ status: 200, type: FacilityChildrenDto })
  list(@CurrentFacility() facilityId: string, @Query() query: FacilityChildrenQueryDto): Promise<FacilityChildrenDto> {
    return this.children.listForFacility(facilityId, query.q);
  }

  @Get('search')
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Busca un niño por DNI o CNV exacto' })
  @ApiResponse({ status: 200, type: SearchResultDto })
  async search(@Query() query: DocumentQueryDto): Promise<SearchResultDto> {
    return { child: await this.children.search(query.document) };
  }

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Registra un niño con sus datos de nacimiento' })
  @ApiResponse({ status: 201, type: ChildRecordDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED o CHILD_DOCUMENT_REQUIRED' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CHILD_DOCUMENT_TAKEN' })
  register(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() body: RegisterChildDto,
  ): Promise<ChildRecordDto> {
    return this.children.register({ actor, facilityId, ip }, body, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre la ficha del niño; la consulta queda en la auditoría' })
  @ApiResponse({ status: 200, type: ChildRecordDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  view(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChildRecordDto> {
    return this.children.view({ actor, facilityId, ip }, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige los datos de identificación y nacimiento del niño' })
  @ApiResponse({ status: 200, type: ChildRecordDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CHILD_DOCUMENT_TAKEN o VERSION_CONFLICT' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateChildDto,
  ): Promise<ChildRecordDto> {
    return this.children.update({ actor, facilityId, ip }, id, body);
  }

  @Post(':id/links')
  @ApiOperation({ summary: 'Vincula un apoderado al niño y emite su código de activación' })
  @ApiResponse({ status: 201, type: LinkCreatedDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'LINK_ALREADY_EXISTS' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'CONSENT_REQUIRED' })
  createLink(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateLinkDto,
  ): Promise<LinkCreatedDto> {
    return this.links.create({ actor, facilityId, ip }, id, body);
  }
}
