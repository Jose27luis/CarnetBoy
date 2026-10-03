import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { DigitizerFacility } from '@carnet/contracts';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { FacilitiesService } from './facilities.service';

class DigitizerFacilityDto implements DigitizerFacility {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ipressCode!: string;
}

@ApiTags('facilities')
@ApiBearerAuth()
@RequireRoles('DIGITIZER')
@Controller('digitizer/facilities')
export class DigitizerFacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los establecimientos donde el digitador tiene una asignación vigente' })
  @ApiResponse({ status: 200, type: [DigitizerFacilityDto] })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<DigitizerFacilityDto[]> {
    return this.facilities.facilitiesOf(user.id);
  }
}
