import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { LoginStep } from '@carnet/contracts';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { Public } from '../../infrastructure/auth/auth-metadata';
import { ClientIp } from '../../infrastructure/auth/current-user.decorator';
import { SENSITIVE_THROTTLE } from '../../infrastructure/throttling/throttling.module';
import { LoginStepDto } from '../identity/dto/auth.dto';
import { ActivationService } from './activation.service';
import { ActivationChallengeDto, CompleteActivationDto, VerifyActivationDto } from './dto/links.dto';

@ApiTags('activation')
@Public()
@Throttle(SENSITIVE_THROTTLE)
@ApiResponse({ status: 429, type: ApiErrorDto, description: 'RATE_LIMITED o ACTIVATION_LOCKED' })
@Controller('activation')
export class ActivationController {
  constructor(private readonly activation: ActivationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Comprueba el DNI y el código de activación sin consumirlo' })
  @ApiResponse({ status: 200, type: ActivationChallengeDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'ACTIVATION_INVALID' })
  verify(@Body() body: VerifyActivationDto): Promise<ActivationChallengeDto> {
    return this.activation.verify(body.dni, body.code);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea la cuenta del apoderado, activa sus vínculos y abre la sesión' })
  @ApiResponse({ status: 200, type: LoginStepDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'ACTIVATION_INVALID o LOGIN_CHALLENGE_INVALID' })
  complete(@Body() body: CompleteActivationDto, @ClientIp() ip: string): Promise<LoginStep> {
    return this.activation.complete(body, ip);
  }
}
