import { ApiProperty } from '@nestjs/swagger';
import {
  CLINICAL_RECORD_TYPES,
  type ClinicalRecordType,
  CORRECTION_STATUSES,
  type CorrectionOutcome,
  type CorrectionRequestItem,
  type CorrectionStatus,
  type PendingCorrection,
} from '@carnet/contracts';
import { IsIn, IsObject, IsString, IsUUID, Length } from 'class-validator';

export class RequestCorrectionDto {
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Todos los campos editables del registro con sus valores corregidos' })
  @IsObject()
  fields!: Record<string, unknown>;

  @ApiProperty({ example: 'El lote se transcribió mal.' })
  @IsString()
  @Length(5, 300)
  reason!: string;
}

export class RejectCorrectionDto {
  @ApiProperty({ example: 'El valor original coincide con la historia clínica.' })
  @IsString()
  @Length(5, 300)
  reason!: string;
}

export class CorrectionStatusQueryDto {
  @ApiProperty({ enum: CORRECTION_STATUSES, default: 'REQUESTED' })
  @IsIn(CORRECTION_STATUSES)
  status: CorrectionStatus = 'REQUESTED';
}

export class RecordParamsDto {
  @ApiProperty({ enum: CLINICAL_RECORD_TYPES })
  @IsIn(CLINICAL_RECORD_TYPES)
  type!: ClinicalRecordType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class CorrectionOutcomeDto implements CorrectionOutcome {
  @ApiProperty({ description: 'true si se aplicó de inmediato; false si quedó pendiente de aprobación' })
  applied!: boolean;
}

export class PendingCorrectionDto implements PendingCorrection {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CLINICAL_RECORD_TYPES })
  recordType!: ClinicalRecordType;

  @ApiProperty({ format: 'uuid' })
  recordId!: string;

  @ApiProperty({ format: 'date-time' })
  requestedAt!: string;
}

export class CorrectionRequestDto implements CorrectionRequestItem {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CLINICAL_RECORD_TYPES })
  recordType!: ClinicalRecordType;

  @ApiProperty({ format: 'uuid' })
  recordId!: string;

  @ApiProperty({ format: 'uuid' })
  childId!: string;

  @ApiProperty()
  childName!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  before!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  proposed!: Record<string, unknown>;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  requestedByName!: string;

  @ApiProperty({ format: 'date-time' })
  requestedAt!: string;

  @ApiProperty({ enum: CORRECTION_STATUSES })
  status!: CorrectionStatus;

  @ApiProperty({ type: String, nullable: true })
  rejectionReason!: string | null;
}
