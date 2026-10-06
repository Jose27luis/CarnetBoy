import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { SENSITIVE_THROTTLE } from '../../infrastructure/throttling/throttling.module';
import { StaffAccountsService } from './accounts/staff-accounts.service';
import { ChangeOwnPasswordDto } from './dto/staff-accounts.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@RequireRoles('ADMIN', 'DIGITIZER')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('account')
export class OwnAccountController {
  constructor(private readonly accounts: StaffAccountsService) {}

  @Post('password')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambia la contraseña propia con la contraseña actual' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Contraseña actual incorrecta o repetida' })
  async changePassword(@CurrentUser() actor: AuthenticatedUser, @Body() body: ChangeOwnPasswordDto, @ClientIp() ip: string): Promise<void> {
    await this.accounts.changeOwnPassword(actor, body.currentPassword, body.newPassword, ip);
  }
}
