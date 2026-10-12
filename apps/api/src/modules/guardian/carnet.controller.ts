import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { GuardianCarnetDto, GuardianChildCardDto } from './carnet.dto';
import { CarnetService } from './carnet.service';

@ApiTags('guardian')
@ApiBearerAuth()
@RequireRoles('GUARDIAN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('me/carnet')
export class CarnetController {
  constructor(private readonly carnet: CarnetService) {}

  @Get()
  @ApiOperation({ summary: 'Tarjetas de los niños con vínculo activo y su avance de vacunas' })
  @ApiResponse({ status: 200, type: [GuardianChildCardDto] })
  cards(@CurrentUser() user: AuthenticatedUser): Promise<GuardianChildCardDto[]> {
    return this.carnet.cards(user.id);
  }

  @Get(':childId')
  @ApiOperation({ summary: 'Carnet completo de un niño vinculado: vacunas, crecimiento, hemoglobina, hierro, citas y logros' })
  @ApiResponse({ status: 200, type: GuardianCarnetDto })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'El niño no existe o el vínculo no está activo' })
  carnetOf(@CurrentUser() user: AuthenticatedUser, @Param('childId', ParseUUIDPipe) childId: string): Promise<GuardianCarnetDto> {
    return this.carnet.carnet(user.id, childId);
  }
}
