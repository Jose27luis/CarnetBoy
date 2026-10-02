import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  APPOINTMENT_TYPES,
  type AppointmentInterval,
  type AppointmentType,
  CATALOG_KINDS,
  CATALOG_STATUSES,
  type CatalogKind,
  type CatalogStatus,
  type CatalogVersion,
  type CatalogVersionDetail,
  type HemoglobinThreshold,
  MAX_AGE_DAYS,
  MAX_AGE_MONTHS,
  type ScheduledDose,
  type Vaccine,
} from '@carnet/contracts';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';

const HEMOGLOBIN_PATTERN = /^\d{1,2}\.\d$/;
const HEMOGLOBIN_MESSAGE = 'Usa un valor en g/dL con un decimal, por ejemplo 11.0.';
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateVaccineDto {
  @ApiProperty({ example: 'NEUMO', description: 'Código corto; no se puede cambiar después' })
  @Matches(/^[A-Za-z0-9_-]{2,32}$/, { message: 'Usa entre 2 y 32 letras, números, guiones o guiones bajos.' })
  code!: string;

  @ApiProperty({ example: 'Antineumocócica' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'Neumonía, meningitis y otitis por neumococo' })
  @IsString()
  @Length(2, 240)
  prevents!: string;
}

export class UpdateVaccineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 240)
  prevents?: string;
}

export class CatalogListQueryDto {
  @ApiProperty({ enum: CATALOG_KINDS })
  @IsIn(CATALOG_KINDS)
  kind!: CatalogKind;
}

export class CreateCatalogVersionDto {
  @ApiProperty({ enum: CATALOG_KINDS })
  @IsIn(CATALOG_KINDS)
  kind!: CatalogKind;

  @ApiProperty({ example: 'NTS N.° 196-MINSA/DGIESP-2022', description: 'Norma técnica de la que salen los valores' })
  @IsString()
  @Length(3, 240)
  norm!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Versión cuyas entradas se copian al nuevo borrador' })
  @IsOptional()
  @IsUUID()
  copyFromId?: string;
}

class ExpectedVersionDto {
  @ApiProperty({ description: 'Versión que se leyó antes de editar' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class UpdateNormDto extends ExpectedVersionDto {
  @ApiProperty()
  @IsString()
  @Length(3, 240)
  norm!: string;
}

export class AddScheduledDoseDto extends ExpectedVersionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vaccineId!: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  doseNumber!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_AGE_DAYS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_DAYS)
  recommendedAgeDays!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_AGE_DAYS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_DAYS)
  maxAgeDays!: number;
}

export class AddHemoglobinThresholdDto extends ExpectedVersionDto {
  @ApiProperty({ minimum: 0, maximum: MAX_AGE_MONTHS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_MONTHS)
  minAgeMonths!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_AGE_MONTHS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_MONTHS)
  maxAgeMonths!: number;

  @ApiProperty({ example: '11.0', description: 'Desde este valor ajustado no hay anemia' })
  @Matches(HEMOGLOBIN_PATTERN, { message: HEMOGLOBIN_MESSAGE })
  normalFrom!: string;

  @ApiProperty({ example: '10.0', description: 'Desde este valor y hasta el anterior la anemia es leve' })
  @Matches(HEMOGLOBIN_PATTERN, { message: HEMOGLOBIN_MESSAGE })
  mildFrom!: string;

  @ApiProperty({ example: '7.0', description: 'Desde este valor la anemia es moderada; por debajo es severa' })
  @Matches(HEMOGLOBIN_PATTERN, { message: HEMOGLOBIN_MESSAGE })
  moderateFrom!: string;
}

export class AddAppointmentIntervalDto extends ExpectedVersionDto {
  @ApiProperty({ enum: APPOINTMENT_TYPES })
  @IsIn(APPOINTMENT_TYPES)
  appointmentType!: AppointmentType;

  @ApiProperty({ minimum: 0, maximum: MAX_AGE_MONTHS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_MONTHS)
  minAgeMonths!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_AGE_MONTHS })
  @IsInt()
  @Min(0)
  @Max(MAX_AGE_MONTHS)
  maxAgeMonths!: number;

  @ApiProperty({ minimum: 1, maximum: 366 })
  @IsInt()
  @Min(1)
  @Max(366)
  intervalDays!: number;
}

export class RemoveEntryDto extends ExpectedVersionDto {}

export class PublishCatalogVersionDto extends ExpectedVersionDto {
  @ApiProperty({ example: '2026-11-01', description: 'Fecha desde la que rige la versión (AAAA-MM-DD)' })
  @Matches(CALENDAR_DATE_PATTERN, { message: 'Usa el formato AAAA-MM-DD.' })
  validFrom!: string;
}

export class VaccineDto implements Vaccine {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  prevents!: string;
}

export class CatalogVersionDto implements CatalogVersion {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CATALOG_KINDS })
  kind!: CatalogKind;

  @ApiProperty()
  norm!: string;

  @ApiProperty({ enum: CATALOG_STATUSES })
  status!: CatalogStatus;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  validFrom!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  validTo!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty()
  entryCount!: number;

  @ApiProperty()
  version!: number;
}

class ScheduledDoseDto implements ScheduledDose {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: VaccineDto })
  vaccine!: VaccineDto;

  @ApiProperty()
  doseNumber!: number;

  @ApiProperty()
  recommendedAgeDays!: number;

  @ApiProperty()
  maxAgeDays!: number;
}

class HemoglobinThresholdDto implements HemoglobinThreshold {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  minAgeMonths!: number;

  @ApiProperty()
  maxAgeMonths!: number;

  @ApiProperty({ example: '11.0' })
  normalFrom!: string;

  @ApiProperty({ example: '10.0' })
  mildFrom!: string;

  @ApiProperty({ example: '7.0' })
  moderateFrom!: string;
}

class AppointmentIntervalDto implements AppointmentInterval {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: APPOINTMENT_TYPES })
  appointmentType!: AppointmentType;

  @ApiProperty()
  minAgeMonths!: number;

  @ApiProperty()
  maxAgeMonths!: number;

  @ApiProperty()
  intervalDays!: number;
}

export class CatalogVersionDetailDto extends CatalogVersionDto implements CatalogVersionDetail {
  @ApiProperty({ type: [ScheduledDoseDto] })
  doses!: ScheduledDoseDto[];

  @ApiProperty({ type: [HemoglobinThresholdDto] })
  thresholds!: HemoglobinThresholdDto[];

  @ApiProperty({ type: [AppointmentIntervalDto] })
  intervals!: AppointmentIntervalDto[];
}
