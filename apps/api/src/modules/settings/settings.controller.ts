import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { SecuritySettings } from '@carnet/contracts';
import { IsBoolean, IsInt, Min } from 'class-validator';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { SecuritySettingsService } from './security-settings.service';

class SecuritySettingsDto implements SecuritySettings {
  @ApiProperty({ description: 'Pide el código de la app autenticadora al personal' })
  totpRequired!: boolean;

  @ApiProperty({ description: 'Obliga al personal a cambiar la contraseña temporal en su primer ingreso' })
  staffPasswordChange!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  updatedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updatedByName!: string | null;

  @ApiProperty({ description: '0 mientras rigen los valores del servidor' })
  version!: number;
}

class UpdateSecuritySettingsDto {
  @ApiProperty()
  @IsBoolean()
  totpRequired!: boolean;

  @ApiProperty()
  @IsBoolean()
  staffPasswordChange!: boolean;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion!: number;
}

@ApiTags('settings')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/settings/security')
export class SettingsController {
  constructor(private readonly security: SecuritySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Configuración de seguridad del ingreso del personal' })
  @ApiResponse({ status: 200, type: SecuritySettingsDto })
  get(): Promise<SecuritySettingsDto> {
    return this.security.current();
  }

  @Put()
  @ApiOperation({ summary: 'Cambia la configuración de seguridad; rige desde el siguiente ingreso' })
  @ApiResponse({ status: 200, type: SecuritySettingsDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'VERSION_CONFLICT' })
  update(@CurrentUser() actor: AuthenticatedUser, @Body() body: UpdateSecuritySettingsDto, @ClientIp() ip: string): Promise<SecuritySettingsDto> {
    return this.security.update(actor, body, ip);
  }
}
