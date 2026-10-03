import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DNI_PATTERN } from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { SENSITIVE_THROTTLE } from '../../infrastructure/throttling/throttling.module';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { GuardianLookupDto } from './dto/children.dto';
import { ActivationCodeDto } from './dto/links.dto';
import { LinksService } from './links.service';

@ApiTags('children')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Facility-Id', required: true, description: 'Establecimiento donde trabaja el digitador' })
@RequireRoles('DIGITIZER')
@UseGuards(AssignedFacilityGuard)
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto, description: 'FORBIDDEN o FACILITY_NOT_ASSIGNED' })
@Controller()
export class GuardiansController {
  constructor(private readonly links: LinksService) {}

  @Get('guardians/by-dni/:dni')
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Busca un apoderado registrado por su DNI' })
  @ApiResponse({ status: 200, type: GuardianLookupDto })
  async byDni(@Param('dni') dni: string): Promise<GuardianLookupDto> {
    if (!DNI_PATTERN.test(dni)) {
      throw DomainError.validation({ dni: ['El DNI tiene 8 dígitos.'] });
    }

    return { guardian: await this.links.guardianByDni(dni) };
  }

  @Post('links/:id/reissue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anula el código pendiente y emite uno nuevo' })
  @ApiResponse({ status: 200, type: ActivationCodeDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'LINK_NOT_PENDING' })
  reissue(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentFacility() facilityId: string,
    @ClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivationCodeDto> {
    return this.links.reissue({ actor, facilityId, ip }, id);
  }
}
