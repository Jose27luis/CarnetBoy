import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type AuthTokens,
  type CurrentAccount,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  ROLES,
  type Role,
  TOTP_CODE_PATTERN,
  type TotpEnrollment,
} from '@carnet/contracts';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export const LOGIN_STEPS = ['AUTHENTICATED', 'PASSWORD_CHANGE_REQUIRED', 'TOTP_ENROLLMENT_REQUIRED', 'TOTP_REQUIRED'] as const;

export class LoginDto {
  @ApiProperty({ example: 'digitador@ejemplo.pe' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

export class ChallengeDto {
  @ApiProperty({ description: 'Token del paso de verificación entregado por el login' })
  @IsString()
  @Length(20, 2048)
  challengeToken!: string;
}

export class InitialPasswordDto extends ChallengeDto {
  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  newPassword!: string;
}

export class TotpCodeDto extends ChallengeDto {
  @ApiProperty({ example: '123456' })
  @Matches(TOTP_CODE_PATTERN, { message: 'El código tiene 6 dígitos.' })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @Length(20, 128)
  refreshToken!: string;
}

export class CurrentAccountDto implements CurrentAccount {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: ROLES })
  role!: Role;
}

export class AuthTokensDto implements AuthTokens {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  accessTokenExpiresAt!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ format: 'date-time' })
  refreshTokenExpiresAt!: string;
}

export class LoginStepDto {
  @ApiProperty({ enum: LOGIN_STEPS })
  step!: (typeof LOGIN_STEPS)[number];

  @ApiPropertyOptional({ type: CurrentAccountDto, description: 'Solo cuando step es AUTHENTICATED' })
  account?: CurrentAccountDto;

  @ApiPropertyOptional({ type: AuthTokensDto, description: 'Solo cuando step es AUTHENTICATED' })
  tokens?: AuthTokensDto;

  @ApiPropertyOptional({ description: 'Token para el siguiente paso cuando falta verificación' })
  challengeToken?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  challengeExpiresAt?: string;
}

export class TotpEnrollmentDto implements TotpEnrollment {
  @ApiProperty({ description: 'Secreto en base32 para ingresarlo a mano si no se puede escanear' })
  secret!: string;

  @ApiProperty({ description: 'Código QR en SVG' })
  qrSvg!: string;
}
