import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { ClientIp, CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { CreateVaccineDto, UpdateVaccineDto, VaccineDto } from './catalogs.dto';
import { VaccinesService } from './vaccines.service';

@ApiTags('catalogs')
@ApiBearerAuth()
@RequireRoles('ADMIN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('admin/vaccines')
export class VaccinesController {
  constructor(private readonly vaccines: VaccinesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las vacunas del catálogo' })
  @ApiResponse({ status: 200, type: [VaccineDto] })
  list(): Promise<VaccineDto[]> {
    return this.vaccines.list();
  }

  @Post()
  @ApiOperation({ summary: 'Registra una vacuna' })
  @ApiResponse({ status: 201, type: VaccineDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'VACCINE_CODE_TAKEN' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateVaccineDto, @ClientIp() ip: string): Promise<VaccineDto> {
    return this.vaccines.create(actor, body, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige el nombre o la enfermedad que previene una vacuna' })
  @ApiResponse({ status: 200, type: VaccineDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVaccineDto,
    @ClientIp() ip: string,
  ): Promise<VaccineDto> {
    return this.vaccines.update(actor, id, body, ip);
  }
}
