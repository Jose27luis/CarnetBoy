import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type AdministeredDoseRecord, DOSE_STATUSES, type DoseStatus, type ImmunizationDose, type ImmunizationStatus } from '@carnet/contracts';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { CALENDAR_DATE_MESSAGE, CALENDAR_DATE_PATTERN, RecordMetaDto } from '../../common/clinical/record-meta.dto';

export class RecordDoseDto {
  @ApiProperty({ format: 'uuid', description: 'Dosis del esquema vigente que se aplicó' })
  @IsUUID()
  scheduledDoseId!: string;

  @ApiProperty({ example: '2026-06-15' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  administeredOn!: string;

  @ApiProperty({ example: 'J4521' })
  @IsString()
  @Length(1, 40)
  lot!: string;

  @ApiPropertyOptional({ description: 'Obligatorio si la edad queda fuera del rango de la dosis' })
  @IsOptional()
  @IsString()
  @Length(3, 300)
  outOfRangeReason?: string;
}

export class AdministeredDoseDto extends RecordMetaDto implements AdministeredDoseRecord {
  @ApiProperty({ format: 'uuid' })
  scheduledDoseId!: string;

  @ApiProperty({ format: 'uuid' })
  vaccineId!: string;

  @ApiProperty()
  vaccineName!: string;

  @ApiProperty()
  doseNumber!: number;

  @ApiProperty({ format: 'date' })
  administeredOn!: string;

  @ApiProperty()
  lot!: string;

  @ApiProperty({ type: String, nullable: true })
  outOfRangeReason!: string | null;
}

class ImmunizationDoseDto implements ImmunizationDose {
  @ApiProperty({ format: 'uuid' })
  scheduledDoseId!: string;

  @ApiProperty({ format: 'uuid' })
  vaccineId!: string;

  @ApiProperty()
  vaccineCode!: string;

  @ApiProperty()
  vaccineName!: string;

  @ApiProperty()
  prevents!: string;

  @ApiProperty()
  doseNumber!: number;

  @ApiProperty()
  recommendedAgeDays!: number;

  @ApiProperty()
  maxAgeDays!: number;

  @ApiProperty({ format: 'date' })
  recommendedDate!: string;

  @ApiProperty({ enum: DOSE_STATUSES })
  status!: DoseStatus;

  @ApiProperty({ type: AdministeredDoseDto, nullable: true })
  applied!: AdministeredDoseDto | null;
}

class ScheduleRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  norm!: string;

  @ApiProperty({ format: 'date' })
  validFrom!: string;
}

export class ImmunizationStatusDto implements ImmunizationStatus {
  @ApiProperty({ type: ScheduleRefDto, nullable: true })
  schedule!: ScheduleRefDto | null;

  @ApiProperty({ type: [ImmunizationDoseDto] })
  doses!: ImmunizationDoseDto[];

  @ApiProperty({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Últimos lotes por vacuna en el establecimiento' })
  recentLots!: Record<string, string[]>;
}
