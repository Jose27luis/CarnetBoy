import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsDto, PushEndpointDto, PushSubscriptionDto, UpdateNotificationSettingsDto } from './notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@RequireRoles('GUARDIAN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('me')
export class NotificationsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Preferencias de avisos del apoderado' })
  @ApiResponse({ status: 200, type: NotificationSettingsDto })
  get(@CurrentUser() user: AuthenticatedUser): Promise<NotificationSettingsDto> {
    return this.settings.settings(user.id);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Activa o desactiva los avisos por correo y push' })
  @ApiResponse({ status: 200, type: NotificationSettingsDto })
  update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateNotificationSettingsDto): Promise<NotificationSettingsDto> {
    return this.settings.update(user.id, { emailEnabled: body.emailEnabled, pushEnabled: body.pushEnabled, email: body.email ?? null });
  }

  @Post('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registra este navegador para recibir avisos push' })
  @ApiResponse({ status: 204 })
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PushSubscriptionDto,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<void> {
    await this.settings.subscribe(user.id, body, userAgent?.slice(0, 300) ?? null);
  }

  @Post('push-subscriptions/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deja de enviar avisos push a este navegador' })
  @ApiResponse({ status: 204 })
  async unsubscribe(@CurrentUser() user: AuthenticatedUser, @Body() body: PushEndpointDto): Promise<void> {
    await this.settings.unsubscribe(user.id, body.endpoint);
  }
}
