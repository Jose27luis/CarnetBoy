import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type GrowthCheckRecord, MEASUREMENT_POSITIONS, type MeasurementPosition } from '@carnet/contracts';
import { IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';
import { CALENDAR_DATE_MESSAGE, CALENDAR_DATE_PATTERN, RecordMetaDto } from '../../common/clinical/record-meta.dto';

export class RecordGrowthCheckDto {
  @ApiProperty({ example: '2026-06-15' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  measuredOn!: string;

  @ApiProperty({ example: '8.250', description: 'Kilogramos con hasta 3 decimales' })
  @Matches(/^\d{1,2}(\.\d{1,3})?$/, { message: 'Usa kilogramos con hasta 3 decimales, por ejemplo 8.250.' })
  weightKg!: string;

  @ApiProperty({ example: '72.5', description: 'Centímetros con un decimal' })
  @Matches(/^\d{2,3}(\.\d)?$/, { message: 'Usa centímetros con un decimal, por ejemplo 72.5.' })
  lengthCm!: string;

  @ApiProperty({ enum: MEASUREMENT_POSITIONS, description: 'Echado (longitud) o de pie (talla)' })
  @IsIn(MEASUREMENT_POSITIONS)
  position!: MeasurementPosition;

  @ApiPropertyOptional({ example: '44.0' })
  @IsOptional()
  @Matches(/^\d{2}(\.\d)?$/, { message: 'Usa centímetros con un decimal, por ejemplo 44.0.' })
  headCircumferenceCm?: string;

  @ApiPropertyOptional({ description: 'Confirma una medida con un cambio de peso mayor al 30 %' })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

export class GrowthCheckDto extends RecordMetaDto implements GrowthCheckRecord {
  @ApiProperty({ format: 'date' })
  measuredOn!: string;

  @ApiProperty()
  weightKg!: string;

  @ApiProperty()
  lengthCm!: string;

  @ApiProperty({ enum: MEASUREMENT_POSITIONS })
  position!: MeasurementPosition;

  @ApiProperty({ type: String, nullable: true })
  headCircumferenceCm!: string | null;

  @ApiProperty()
  ageDays!: number;

  @ApiProperty()
  correctedAgeDays!: number;

  @ApiProperty({ type: String, nullable: true })
  zWeightForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zLengthForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zWeightForLength!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zHeadForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  weightForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lengthForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  weightForLength!: string | null;

  @ApiProperty({ type: String, nullable: true })
  headForAge!: string | null;

  @ApiProperty({ example: 'OMS 2006' })
  referenceVersion!: string;
}
