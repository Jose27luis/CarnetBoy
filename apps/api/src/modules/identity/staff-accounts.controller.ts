import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { StaffAccountsService } from './accounts/staff-accounts.service';
import { CreateStaffAccountDto, StaffAccountCreatedDto, StaffAccountDto, TemporaryPasswordDto } from './dto/staff-accounts.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/accounts')
export class StaffAccountsController {
  constructor(private readonly accounts: StaffAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las cuentas de admins y digitadores' })
  @ApiResponse({ status: 200, type: [StaffAccountDto] })
  list(): Promise<StaffAccountDto[]> {
    return this.accounts.list();
  }

  @Post()
  @ApiOperation({ summary: 'Crea una cuenta de admin o digitador con contraseña temporal' })
  @ApiResponse({ status: 201, type: StaffAccountCreatedDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'EMAIL_TAKEN' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateStaffAccountDto,
    @ClientIp() ip: string,
  ): Promise<StaffAccountCreatedDto> {
    return this.accounts.create(actor, body, ip);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspende la cuenta y cierra todas sus sesiones' })
  @ApiResponse({ status: 200, type: StaffAccountDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CANNOT_CHANGE_OWN_ACCOUNT o LAST_ACTIVE_ADMIN' })
  suspend(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientIp() ip: string,
  ): Promise<StaffAccountDto> {
    return this.accounts.suspend(actor, id, ip);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactiva una cuenta suspendida' })
  @ApiResponse({ status: 200, type: StaffAccountDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CANNOT_CHANGE_OWN_ACCOUNT' })
  reactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientIp() ip: string,
  ): Promise<StaffAccountDto> {
    return this.accounts.reactivate(actor, id, ip);
  }

  @Post(':id/totp-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Borra el segundo factor; la persona lo vuelve a configurar en su siguiente ingreso' })
  @ApiResponse({ status: 200, type: StaffAccountDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CANNOT_CHANGE_OWN_ACCOUNT' })
  resetTotp(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientIp() ip: string,
  ): Promise<StaffAccountDto> {
    return this.accounts.resetTotp(actor, id, ip);
  }

  @Post(':id/password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera una contraseña temporal nueva, desbloquea la cuenta y cierra sus sesiones' })
  @ApiResponse({ status: 200, type: TemporaryPasswordDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'CANNOT_CHANGE_OWN_ACCOUNT' })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientIp() ip: string,
  ): Promise<TemporaryPasswordDto> {
    return this.accounts.resetPassword(actor, id, ip);
  }
}
