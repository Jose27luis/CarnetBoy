import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BLOOD_TYPES,
  type BloodType,
  type BirthRecord,
  type ChildRecord,
  type ChildSummary,
  CNV_PATTERN,
  DELIVERY_TYPES,
  type DeliveryType,
  DNI_PATTERN,
  type Guardian,
  type GuardianLink,
  LINK_STATUSES,
  type LinkStatus,
  RELATIONSHIPS,
  type Relationship,
  SEXES,
  type Sex,
} from '@carnet/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DECIMAL_PATTERN = /^\d{2}(\.\d)?$/;

export class DocumentQueryDto {
  @ApiProperty({ example: '78945612', description: 'DNI de 8 dígitos o CNV de 8 a 12 dígitos' })
  @Matches(/^\d{8,12}$/, { message: 'Ingresa un DNI de 8 dígitos o un CNV de 8 a 12 dígitos.' })
  document!: string;
}

export class BirthInputDto {
  @ApiPropertyOptional({ example: 'Hospital Nacional Edgardo Rebagliati' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  birthPlace?: string;

  @ApiPropertyOptional({ enum: DELIVERY_TYPES })
  @IsOptional()
  @IsIn(DELIVERY_TYPES)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ minimum: 300, maximum: 6500 })
  @IsOptional()
  @IsInt()
  @Min(300, { message: 'El peso al nacer va de 300 a 6500 gramos.' })
  @Max(6500, { message: 'El peso al nacer va de 300 a 6500 gramos.' })
  weightGrams?: number;

  @ApiPropertyOptional({ example: '49.5' })
  @IsOptional()
  @Matches(ONE_DECIMAL_PATTERN, { message: 'Usa centímetros con un decimal, por ejemplo 49.5.' })
  lengthCm?: string;

  @ApiPropertyOptional({ example: '34.0' })
  @IsOptional()
  @Matches(ONE_DECIMAL_PATTERN, { message: 'Usa centímetros con un decimal, por ejemplo 34.0.' })
  headCircumferenceCm?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar1?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar5?: number;
}

export class ChildIdentityDto {
  @ApiPropertyOptional({ example: '78945612' })
  @IsOptional()
  @Matches(DNI_PATTERN, { message: 'El DNI tiene 8 dígitos.' })
  dni?: string;

  @ApiPropertyOptional({ example: '1002345678' })
  @IsOptional()
  @Matches(CNV_PATTERN, { message: 'El CNV tiene de 8 a 12 dígitos.' })
  cnv?: string;

  @ApiProperty({ example: 'Valentina Sofía' })
  @IsString()
  @Length(1, 120)
  givenNames!: string;

  @ApiProperty({ example: 'Quispe' })
  @IsString()
  @Length(1, 80)
  paternalSurname!: string;

  @ApiProperty({ example: 'Mamani' })
  @IsString()
  @Length(1, 80)
  maternalSurname!: string;

  @ApiProperty({ enum: SEXES })
  @IsIn(SEXES)
  sex!: Sex;

  @ApiProperty({ example: '2026-04-12' })
  @Matches(CALENDAR_DATE_PATTERN, { message: 'Usa el formato AAAA-MM-DD.' })
  birthDate!: string;

  @ApiPropertyOptional({ minimum: 22, maximum: 44 })
  @IsOptional()
  @IsInt()
  @Min(22, { message: 'Las semanas de gestación van de 22 a 44.' })
  @Max(44, { message: 'Las semanas de gestación van de 22 a 44.' })
  gestationalWeeks?: number;

  @ApiPropertyOptional({ enum: BLOOD_TYPES })
  @IsOptional()
  @IsIn(BLOOD_TYPES)
  bloodType?: BloodType;

  @ApiPropertyOptional({ type: BirthInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BirthInputDto)
  birth?: BirthInputDto;
}

export class RegisterChildDto extends ChildIdentityDto {}

export class UpdateChildDto extends ChildIdentityDto {
  @ApiProperty({ description: 'Versión que se leyó antes de editar' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class BirthRecordDto implements BirthRecord {
  @ApiProperty({ type: String, nullable: true })
  birthPlace!: string | null;

  @ApiProperty({ enum: DELIVERY_TYPES, nullable: true })
  deliveryType!: DeliveryType | null;

  @ApiProperty({ type: Number, nullable: true })
  weightGrams!: number | null;

  @ApiProperty({ type: String, nullable: true })
  lengthCm!: string | null;

  @ApiProperty({ type: String, nullable: true })
  headCircumferenceCm!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  apgar1!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  apgar5!: number | null;
}

export class ChildSummaryDto implements ChildSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  dni!: string | null;

  @ApiProperty({ type: String, nullable: true })
  cnv!: string | null;

  @ApiProperty()
  givenNames!: string;

  @ApiProperty()
  paternalSurname!: string;

  @ApiProperty()
  maternalSurname!: string;

  @ApiProperty({ enum: SEXES })
  sex!: Sex;

  @ApiProperty({ format: 'date' })
  birthDate!: string;
}

export class SearchResultDto {
  @ApiProperty({ type: ChildSummaryDto, nullable: true })
  child!: ChildSummaryDto | null;
}

export class GuardianDto implements Guardian {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  dni!: string;

  @ApiProperty()
  givenNames!: string;

  @ApiProperty()
  paternalSurname!: string;

  @ApiProperty()
  maternalSurname!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty()
  hasAccount!: boolean;
}

export class GuardianLookupDto {
  @ApiProperty({ type: GuardianDto, nullable: true })
  guardian!: GuardianDto | null;
}

export class GuardianLinkDto implements GuardianLink {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LINK_STATUSES })
  status!: LinkStatus;

  @ApiProperty({ enum: RELATIONSHIPS })
  relationship!: Relationship;

  @ApiProperty({ type: GuardianDto })
  guardian!: GuardianDto;

  @ApiProperty({ format: 'date-time' })
  consentAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  pendingCodeExpiresAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  revocationReason!: string | null;

  @ApiProperty()
  version!: number;
}

export class ChildRecordDto extends ChildSummaryDto implements ChildRecord {
  @ApiProperty({ type: Number, nullable: true })
  gestationalWeeks!: number | null;

  @ApiProperty({ enum: BLOOD_TYPES, nullable: true })
  bloodType!: BloodType | null;

  @ApiProperty({ type: BirthRecordDto, nullable: true })
  birth!: BirthRecordDto | null;

  @ApiProperty({ type: [GuardianLinkDto] })
  links!: GuardianLinkDto[];

  @ApiProperty()
  version!: number;
}
