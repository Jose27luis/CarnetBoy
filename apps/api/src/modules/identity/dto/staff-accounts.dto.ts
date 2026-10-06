import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  STAFF_ROLES,
  type StaffAccount,
  type StaffAccountCreated,
  type StaffRole,
  type TemporaryPasswordIssued,
} from '@carnet/contracts';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const PASSWORD_LENGTH_MESSAGE = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`;

export class UpdateStaffAccountDto {
  @ApiProperty({ example: 'digitador@ejemplo.pe' })
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Rosa Quispe Mamani' })
  @IsString()
  @Length(3, 160, { message: 'El nombre debe tener entre 3 y 160 caracteres.' })
  fullName!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role!: StaffRole;
}

export class CreateStaffAccountDto extends UpdateStaffAccountDto {
  @ApiPropertyOptional({ minLength: PASSWORD_MIN_LENGTH, description: 'Si se omite, se genera una contraseña temporal' })
  @IsOptional()
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: PASSWORD_LENGTH_MESSAGE })
  password?: string;

  @ApiPropertyOptional({ description: 'Pedir que la cambie en su primer ingreso; por defecto sí' })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;
}

export class SetPasswordDto {
  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: PASSWORD_LENGTH_MESSAGE })
  password!: string;

  @ApiProperty({ description: 'Pedir que la cambie en su siguiente ingreso' })
  @IsBoolean()
  requirePasswordChange!: boolean;
}

export class ChangeOwnPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: PASSWORD_LENGTH_MESSAGE })
  newPassword!: string;
}

export class StaffAccountDto implements StaffAccount {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  role!: StaffRole;

  @ApiProperty({ enum: ACCOUNT_STATUSES })
  status!: AccountStatus;

  @ApiProperty()
  totpEnabled!: boolean;

  @ApiProperty()
  passwordChangeRequired!: boolean;

  @ApiProperty({ description: 'Bloqueada en este momento por intentos fallidos' })
  locked!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lockedUntil!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class StaffAccountCreatedDto implements StaffAccountCreated {
  @ApiProperty({ type: StaffAccountDto })
  account!: StaffAccountDto;

  @ApiProperty({ type: String, nullable: true, description: 'Solo si se generó; se muestra una sola vez' })
  temporaryPassword!: string | null;
}

export class TemporaryPasswordDto implements TemporaryPasswordIssued {
  @ApiProperty({ description: 'Se muestra una sola vez; la persona la cambia en su siguiente ingreso' })
  temporaryPassword!: string;
}
