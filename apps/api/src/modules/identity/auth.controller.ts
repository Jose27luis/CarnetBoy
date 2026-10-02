import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { LoginStep } from '@carnet/contracts';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { Public } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { SENSITIVE_THROTTLE } from '../../infrastructure/throttling/throttling.module';
import {
  AuthTokensDto,
  ChallengeDto,
  CurrentAccountDto,
  InitialPasswordDto,
  LoginDto,
  LoginStepDto,
  RefreshTokenDto,
  TotpCodeDto,
  TotpEnrollmentDto,
} from './dto/auth.dto';
import { LoginService } from './login/login.service';
import { SessionService } from './sessions/session.service';

@ApiTags('identity')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly logins: LoginService,
    private readonly sessions: SessionService,
  ) {}

  @Post('login')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida correo y contraseña e indica el siguiente paso del ingreso' })
  @ApiResponse({ status: 200, type: LoginStepDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'ACCOUNT_SUSPENDED' })
  @ApiResponse({ status: 423, type: ApiErrorDto, description: 'ACCOUNT_LOCKED' })
  @ApiResponse({ status: 429, type: ApiErrorDto })
  login(@Body() body: LoginDto, @ClientIp() ip: string): Promise<LoginStep> {
    return this.logins.login(body.email, body.password, ip);
  }

  @Post('password/initial')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reemplaza la contraseña temporal en el primer ingreso' })
  @ApiResponse({ status: 200, type: LoginStepDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'LOGIN_CHALLENGE_INVALID' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'PASSWORD_CHANGE_NOT_REQUIRED' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'PASSWORD_REUSED' })
  changeInitialPassword(@Body() body: InitialPasswordDto, @ClientIp() ip: string): Promise<LoginStep> {
    return this.logins.changeInitialPassword(body.challengeToken, body.newPassword, ip);
  }

  @Post('totp/enrollment')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera el secreto y el código QR del segundo factor' })
  @ApiResponse({ status: 200, type: TotpEnrollmentDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'LOGIN_CHALLENGE_INVALID' })
  startTotpEnrollment(@Body() body: ChallengeDto): Promise<TotpEnrollmentDto> {
    return this.logins.startTotpEnrollment(body.challengeToken);
  }

  @Post('totp/verify')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el código del segundo factor y abre la sesión' })
  @ApiResponse({ status: 200, type: LoginStepDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'INVALID_TOTP_CODE o LOGIN_CHALLENGE_INVALID' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'TOTP_NOT_ENROLLED' })
  @ApiResponse({ status: 423, type: ApiErrorDto, description: 'ACCOUNT_LOCKED' })
  verifyTotp(@Body() body: TotpCodeDto, @ClientIp() ip: string): Promise<LoginStep> {
    return this.logins.verifyTotp(body.challengeToken, body.code, ip);
  }

  @Post('refresh')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el refresh token y entrega un access token nuevo' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'UNAUTHENTICATED o SESSION_EXPIRED' })
  @ApiResponse({ status: 429, type: ApiErrorDto })
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.sessions.rotate(body.refreshToken);
  }

  @Post('logout')
  @Public()
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cierra la sesión del refresh token indicado' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 429, type: ApiErrorDto })
  async logout(@Body() body: RefreshTokenDto): Promise<void> {
    await this.sessions.close(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve la cuenta de la sesión actual' })
  @ApiResponse({ status: 200, type: CurrentAccountDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentAccountDto> {
    return this.logins.currentAccount(user.id);
  }
}
