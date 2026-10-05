import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FacilityActivity } from '@carnet/contracts';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import { FacilityActivityService } from './facility-activity.service';

class FacilityActivityDto implements FacilityActivity {
  @ApiProperty({ format: 'uuid' })
  facilityId!: string;

  @ApiProperty()
  childrenRegistered!: number;

  @ApiProperty()
  linksCreated!: number;
}

@ApiTags('children')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@Controller('admin/facility-activity')
export class FacilityActivityController {
  constructor(private readonly activity: FacilityActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Cuenta niños registrados y vínculos creados por establecimiento' })
  @ApiResponse({ status: 200, type: [FacilityActivityDto] })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  list(): Promise<FacilityActivityDto[]> {
    return this.activity.perFacility();
  }
}
