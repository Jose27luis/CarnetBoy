import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { AssignDigitizerDto, CreateFacilityDto, FacilityAssignmentDto, FacilityDto, UpdateFacilityDto } from './facilities.dto';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/facilities')
export class FacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los establecimientos' })
  @ApiResponse({ status: 200, type: [FacilityDto] })
  list(): Promise<FacilityDto[]> {
    return this.facilities.list();
  }

  @Post()
  @ApiOperation({ summary: 'Registra un establecimiento con su altitud' })
  @ApiResponse({ status: 201, type: FacilityDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'IPRESS_CODE_TAKEN' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateFacilityDto, @ClientIp() ip: string): Promise<FacilityDto> {
    return this.facilities.create(actor, body, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita, activa o desactiva un establecimiento' })
  @ApiResponse({ status: 200, type: FacilityDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'VERSION_CONFLICT' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFacilityDto,
    @ClientIp() ip: string,
  ): Promise<FacilityDto> {
    return this.facilities.update(actor, id, body, ip);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Lista las asignaciones vigentes de digitadores' })
  @ApiResponse({ status: 200, type: [FacilityAssignmentDto] })
  assignments(): Promise<FacilityAssignmentDto[]> {
    return this.facilities.activeAssignments();
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Asigna un digitador al establecimiento' })
  @ApiResponse({ status: 201, type: FacilityAssignmentDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'ASSIGNMENT_ALREADY_ACTIVE' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'ROLE_NOT_ASSIGNABLE o FACILITY_INACTIVE' })
  assign(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignDigitizerDto,
    @ClientIp() ip: string,
  ): Promise<FacilityAssignmentDto> {
    return this.facilities.assign(actor, id, body.accountId, ip);
  }

  @Post(':id/assignments/:accountId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Termina la asignación vigente de un digitador' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'ASSIGNMENT_NOT_ACTIVE' })
  async endAssignment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @ClientIp() ip: string,
  ): Promise<void> {
    await this.facilities.endAssignment(actor, id, accountId, ip);
  }
}
