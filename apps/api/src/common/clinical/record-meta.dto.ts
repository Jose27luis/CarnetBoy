import { ApiProperty } from '@nestjs/swagger';
import type { RecordMeta } from '@carnet/contracts';

export class RecordMetaDto implements RecordMeta {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  recordedAt!: string;

  @ApiProperty()
  recordedByName!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: String, nullable: true })
  correctionReason!: string | null;

  @ApiProperty({ description: 'El registro es de quien consulta y tiene menos de 72 horas' })
  canCorrectDirectly!: boolean;
}

export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const CALENDAR_DATE_MESSAGE = 'Usa el formato AAAA-MM-DD.';
