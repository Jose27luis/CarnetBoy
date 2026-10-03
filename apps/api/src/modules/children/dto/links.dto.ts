import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ACTIVATION_CODE_PATTERN,
  type ActivationChallenge,
  type ActivationCodeIssued,
  type AdminLinkItem,
  DNI_PATTERN,
  GUARDIAN_PASSWORD_MIN_LENGTH,
  type GuardianChildName,
  LINK_STATUSES,
  type LinkCreated,
  type LinkStatus,
  PASSWORD_MAX_LENGTH,
  type PersonName,
  RELATIONSHIPS,
  type Relationship,
} from '@carnet/contracts';
import { Transform, Type } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { ChildSummaryDto, GuardianDto, GuardianLinkDto } from './children.dto';

export class GuardianDetailsDto {
  @ApiProperty({ example: 'Rosa Elena' })
  @IsString()
  @Length(1, 120)
  givenNames!: string;

  @ApiProperty({ example: 'Mamani' })
  @IsString()
  @Length(1, 80)
  paternalSurname!: string;

  @ApiProperty({ example: 'Huamán' })
  @IsString()
  @Length(1, 80)
  maternalSurname!: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @Matches(/^\d{7,15}$/, { message: 'El celular solo lleva dígitos, de 7 a 15.' })
  phone?: string;

  @ApiPropertyOptional({ example: 'rosa@correo.pe' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class CreateLinkDto {
  @ApiProperty({ example: '45678912' })
  @Matches(DNI_PATTERN, { message: 'El DNI tiene 8 dígitos.' })
  guardianDni!: string;

  @ApiPropertyOptional({ type: GuardianDetailsDto, description: 'Obligatorio si el apoderado aún no está registrado' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardianDetailsDto)
  guardian?: GuardianDetailsDto;

  @ApiProperty({ enum: RELATIONSHIPS })
  @IsIn(RELATIONSHIPS)
  relationship!: Relationship;

  @ApiProperty({ description: 'El apoderado escuchó y aceptó el consentimiento' })
  @IsBoolean()
  @Equals(true, { message: 'El apoderado debe aceptar el consentimiento.' })
  consentAccepted!: boolean;

  @ApiProperty({ example: '2026-10' })
  @IsString()
  @Length(1, 16)
  consentVersion!: string;
}

export class LinkCreatedDto implements LinkCreated {
  @ApiProperty({ type: GuardianLinkDto })
  link!: GuardianLinkDto;

  @ApiProperty({ type: String, nullable: true, description: 'Se muestra una sola vez' })
  activationCode!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  codeExpiresAt!: string | null;
}

export class ActivationCodeDto implements ActivationCodeIssued {
  @ApiProperty({ description: 'Se muestra una sola vez' })
  activationCode!: string;

  @ApiProperty({ format: 'date-time' })
  codeExpiresAt!: string;
}

export class RevokeLinkDto {
  @ApiProperty({ example: 'Orden judicial de alejamiento' })
  @IsString()
  @Length(5, 500)
  reason!: string;

  @ApiProperty({ example: 'Expediente 01234-2026-0-1801-JR-FC-01' })
  @IsString()
  @Length(3, 160)
  document!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class AdminLinkDto implements AdminLinkItem {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LINK_STATUSES })
  status!: LinkStatus;

  @ApiProperty({ enum: RELATIONSHIPS })
  relationship!: Relationship;

  @ApiProperty({ type: ChildSummaryDto })
  child!: ChildSummaryDto;

  @ApiProperty({ type: GuardianDto })
  guardian!: GuardianDto;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  revocationReason!: string | null;

  @ApiProperty()
  version!: number;
}

export class VerifyActivationDto {
  @ApiProperty({ example: '45678912' })
  @Matches(DNI_PATTERN, { message: 'El DNI tiene 8 dígitos.' })
  dni!: string;

  @ApiProperty({ example: 'K7PM3QXA' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : value))
  @Matches(ACTIVATION_CODE_PATTERN, { message: 'El código tiene 8 letras y números.' })
  code!: string;
}

export class CompleteActivationDto {
  @ApiProperty()
  @IsString()
  @Length(20, 2048)
  challengeToken!: string;

  @ApiProperty({ minLength: GUARDIAN_PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(GUARDIAN_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `La contraseña debe tener entre ${GUARDIAN_PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  password!: string;

  @ApiPropertyOptional({ example: 'rosa@correo.pe' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

class PersonNameDto implements PersonName {
  @ApiProperty()
  givenNames!: string;

  @ApiProperty()
  paternalSurname!: string;

  @ApiProperty()
  maternalSurname!: string;
}

export class ActivationChallengeDto implements ActivationChallenge {
  @ApiProperty()
  challengeToken!: string;

  @ApiProperty({ format: 'date-time' })
  challengeExpiresAt!: string;

  @ApiProperty({ type: PersonNameDto })
  guardian!: PersonNameDto;

  @ApiProperty({ type: [PersonNameDto] })
  children!: PersonNameDto[];
}

export class GuardianChildNameDto extends PersonNameDto implements GuardianChildName {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}
