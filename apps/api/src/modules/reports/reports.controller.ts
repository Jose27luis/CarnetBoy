import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AdminDashboard, DigitizerDashboard } from '@carnet/contracts';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import { AssignedFacilityGuard, CurrentFacility } from '../facilities/assigned-facility.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('admin/dashboard')
  @RequireRoles('ADMIN')
  @ApiOperation({ summary: 'Indicadores agregados del sistema, sin datos personales' })
  @ApiOkResponse({ description: 'Totales, actividad mensual, estado nutricional, anemia, citas, vacunas y establecimientos' })
  admin(): Promise<AdminDashboard> {
    return this.reports.adminDashboard();
  }

  @Get('digitizer/dashboard')
  @RequireRoles('DIGITIZER')
  @UseGuards(AssignedFacilityGuard)
  @ApiHeader({ name: 'X-Facility-Id', required: true })
  @ApiOperation({ summary: 'Indicadores del establecimiento elegido' })
  @ApiOkResponse({ description: 'Citas de hoy, atrasadas, registros del mes y actividad semanal' })
  digitizer(@CurrentFacility() facilityId: string): Promise<DigitizerDashboard> {
    return this.reports.digitizerDashboard(facilityId);
  }
}
