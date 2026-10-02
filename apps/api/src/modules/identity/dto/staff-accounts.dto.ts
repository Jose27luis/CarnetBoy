import { ApiProperty } from '@nestjs/swagger';
import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  STAFF_ROLES,
  type StaffAccount,
  type StaffAccountCreated,
  type StaffRole,
  type TemporaryPasswordIssued,
} from '@carnet/contracts';
import { IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator';

export class CreateStaffAccountDto {
  @ApiProperty({ example: 'digitador@ejemplo.pe' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Rosa Quispe Mamani' })
  @IsString()
  @Length(3, 160)
  fullName!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role!: StaffRole;
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

  @ApiProperty({ description: 'Se muestra una sola vez; la persona la cambia en su primer ingreso' })
  temporaryPassword!: string;
}

export class TemporaryPasswordDto implements TemporaryPasswordIssued {
  @ApiProperty({ description: 'Se muestra una sola vez; la persona la cambia en su siguiente ingreso' })
  temporaryPassword!: string;
}
