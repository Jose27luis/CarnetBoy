import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { IdempotencyKey } from '../../infrastructure/idempotency/idempotency-key.decorator';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import {
  AgendaDto,
  AgendaQueryDto,
  AppointmentDto,
  ChildScheduleDto,
  CloseAppointmentDto,
  RescheduleAppointmentDto,
  ScheduleAppointmentDto,
} from './schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('schedule')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller()
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('children/:id/appointments')
  @ApiOperation({ summary: 'Citas del niño y fechas propuestas para las que faltan' })
  @ApiResponse({ status: 200, type: ChildScheduleDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  forChild(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChildScheduleDto> {
    return this.schedule.forChild(user.id, facilityId, id);
  }

  @Post('children/:id/appointments')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Programa una cita en el establecimiento elegido' })
  @ApiResponse({ status: 201, type: AppointmentDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'APPOINTMENT_ALREADY_SCHEDULED' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @IdempotencyKey() idempotencyKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ScheduleAppointmentDto,
  ): Promise<AppointmentDto> {
    return this.schedule.schedule({ actor, facilityId, ip }, id, body, idempotencyKey);
  }

  @Patch('appointments/:id')
  @ApiOperation({ summary: 'Cambia la fecha de una cita programada' })
  @ApiResponse({ status: 200, type: AppointmentDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'APPOINTMENT_NOT_SCHEDULED o VERSION_CONFLICT' })
  reschedule(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleAppointmentDto,
  ): Promise<AppointmentDto> {
    return this.schedule.reschedule({ actor, facilityId, ip }, id, body.scheduledOn, body.expectedVersion);
  }

  @Post('appointments/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca la cita como atendida, perdida o cancelada' })
  @ApiResponse({ status: 200, type: AppointmentDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'APPOINTMENT_NOT_SCHEDULED o VERSION_CONFLICT' })
  close(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseAppointmentDto,
  ): Promise<AppointmentDto> {
    return this.schedule.close({ actor, facilityId, ip }, id, body);
  }

  @Get('digitizer/agenda')
  @ApiOperation({ summary: 'Citas del día en el establecimiento elegido y las atrasadas' })
  @ApiResponse({ status: 200, type: AgendaDto })
  agenda(@CurrentFacility() facilityId: string, @Query() query: AgendaQueryDto): Promise<AgendaDto> {
    return this.schedule.agenda(facilityId, query.date);
  }
}
