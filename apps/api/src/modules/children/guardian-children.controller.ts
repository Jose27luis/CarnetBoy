import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { GuardianChildNameDto } from './dto/links.dto';
import { GuardianChildrenService } from './guardian-children.service';

@ApiTags('children')
@ApiBearerAuth()
@RequireRoles('GUARDIAN')
@Controller('me/children')
export class GuardianChildrenController {
  constructor(private readonly children: GuardianChildrenService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los niños con vínculo activo del apoderado' })
  @ApiResponse({ status: 200, type: [GuardianChildNameDto] })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<GuardianChildNameDto[]> {
    return this.children.childrenOf(user.id);
  }
}
