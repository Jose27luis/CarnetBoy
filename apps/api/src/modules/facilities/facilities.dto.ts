import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALTITUDE_MAX_METERS,
  ALTITUDE_MIN_METERS,
  type Facility,
  type FacilityAssignmentItem,
  IPRESS_CODE_PATTERN,
} from '@carnet/contracts';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';

export class CreateFacilityDto {
  @ApiProperty({ example: '00012345', description: 'Código IPRESS de 8 dígitos' })
  @Matches(IPRESS_CODE_PATTERN, { message: 'El código IPRESS tiene 8 dígitos.' })
  ipressCode!: string;

  @ApiProperty({ example: 'CAP III Puente Piedra' })
  @IsString()
  @Length(3, 160)
  name!: string;

  @ApiProperty({ example: 'Red Asistencial Sabogal' })
  @IsString()
  @Length(3, 120)
  healthNetwork!: string;

  @ApiProperty({ minimum: ALTITUDE_MIN_METERS, maximum: ALTITUDE_MAX_METERS, example: 180 })
  @IsInt()
  @Min(ALTITUDE_MIN_METERS)
  @Max(ALTITUDE_MAX_METERS)
  altitudeMeters!: number;
}

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 120)
  healthNetwork?: string;

  @ApiPropertyOptional({ minimum: ALTITUDE_MIN_METERS, maximum: ALTITUDE_MAX_METERS })
  @IsOptional()
  @IsInt()
  @Min(ALTITUDE_MIN_METERS)
  @Max(ALTITUDE_MAX_METERS)
  altitudeMeters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Versión que se leyó antes de editar' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class AssignDigitizerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;
}

export class FacilityDto implements Facility {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  ipressCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  healthNetwork!: string;

  @ApiProperty()
  altitudeMeters!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  version!: number;
}

export class FacilityAssignmentDto implements FacilityAssignmentItem {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ format: 'uuid' })
  facilityId!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty()
  ipressCode!: string;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;
}
