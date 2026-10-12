import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { NotificationSettings, PushSubscriptionInput } from '@carnet/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateNested } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiProperty()
  @IsBoolean()
  emailEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  pushEnabled!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Correo para los avisos; vacío usa el registrado en el establecimiento' })
  @IsOptional()
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  @MaxLength(254)
  email?: string | null;
}

class PushKeysDto {
  @ApiProperty()
  @IsString()
  @Length(10, 200)
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 100)
  auth!: string;
}

export class PushSubscriptionDto implements PushSubscriptionInput {
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint!: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class PushEndpointDto {
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint!: string;
}

export class NotificationSettingsDto implements NotificationSettings {
  @ApiProperty()
  emailEnabled!: boolean;

  @ApiProperty()
  pushEnabled!: boolean;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Correo que registró el establecimiento' })
  registeredEmail!: string | null;

  @ApiProperty({ description: 'El servidor tiene configurado el envío de correos' })
  emailConfigured!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Clave pública VAPID; null si el push no está configurado' })
  pushPublicKey!: string | null;

  @ApiProperty()
  pushDevices!: number;
}
