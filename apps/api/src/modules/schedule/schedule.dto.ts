import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type Agenda,
  APPOINTMENT_ORIGINS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  type Appointment,
  type AppointmentOrigin,
  type AppointmentProposal,
  type AppointmentStatus,
  type AppointmentType,
  type ChildSchedule,
  CLOSING_STATUSES,
  type ClosingStatus,
} from '@carnet/contracts';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { CALENDAR_DATE_MESSAGE, CALENDAR_DATE_PATTERN } from '../../common/clinical/record-meta.dto';

export class ScheduleAppointmentDto {
  @ApiProperty({ enum: APPOINTMENT_TYPES })
  @IsIn(APPOINTMENT_TYPES)
  type!: AppointmentType;

  @ApiProperty({ example: '2026-11-12' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  scheduledOn!: string;

  @ApiProperty({ enum: APPOINTMENT_ORIGINS, description: 'SYSTEM si se aceptó la fecha propuesta sin cambios' })
  @IsIn(APPOINTMENT_ORIGINS)
  origin!: AppointmentOrigin;

  @ApiPropertyOptional({ example: 'Traer el carnet físico' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  note?: string;
}

class ExpectedVersionDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class RescheduleAppointmentDto extends ExpectedVersionDto {
  @ApiProperty({ example: '2026-11-19' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  scheduledOn!: string;
}

export class CloseAppointmentDto extends ExpectedVersionDto {
  @ApiProperty({ enum: CLOSING_STATUSES })
  @IsIn(CLOSING_STATUSES)
  status!: ClosingStatus;

  @ApiPropertyOptional({ description: 'Obligatorio al cancelar' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

export class AgendaQueryDto {
  @ApiPropertyOptional({ example: '2026-11-12', description: 'Por defecto, hoy' })
  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  date?: string;
}

export class AppointmentDto implements Appointment {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  childId!: string;

  @ApiProperty()
  childName!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty({ enum: APPOINTMENT_TYPES })
  type!: AppointmentType;

  @ApiProperty({ format: 'date' })
  scheduledOn!: string;

  @ApiProperty({ enum: APPOINTMENT_STATUSES })
  status!: AppointmentStatus;

  @ApiProperty({ enum: APPOINTMENT_ORIGINS })
  origin!: AppointmentOrigin;

  @ApiProperty({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ type: String, nullable: true })
  cancelReason!: string | null;

  @ApiProperty()
  createdByName!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt!: string | null;

  @ApiProperty()
  version!: number;
}

class AppointmentProposalDto implements AppointmentProposal {
  @ApiProperty({ enum: APPOINTMENT_TYPES })
  type!: AppointmentType;

  @ApiProperty({ format: 'date' })
  suggestedOn!: string;

  @ApiProperty()
  basis!: string;
}

export class ChildScheduleDto implements ChildSchedule {
  @ApiProperty({ type: [AppointmentDto] })
  upcoming!: AppointmentDto[];

  @ApiProperty({ type: [AppointmentDto] })
  history!: AppointmentDto[];

  @ApiProperty({ type: [AppointmentProposalDto] })
  proposals!: AppointmentProposalDto[];

  @ApiProperty({ description: 'Hay intervalos de citas publicados para proponer controles y dosajes' })
  intervalsPublished!: boolean;
}

export class AgendaDto implements Agenda {
  @ApiProperty({ format: 'date' })
  date!: string;

  @ApiProperty({ type: [AppointmentDto] })
  appointments!: AppointmentDto[];

  @ApiProperty({ type: [AppointmentDto], description: 'Citas programadas de días anteriores que siguen abiertas' })
  overdue!: AppointmentDto[];
}
