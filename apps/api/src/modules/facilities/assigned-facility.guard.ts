import { type CanActivate, type ExecutionContext, HttpStatus, Injectable, createParamDecorator } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedRequest } from '../../infrastructure/auth/authenticated-user';
import { FacilitiesService } from './facilities.service';

export const FACILITY_HEADER = 'x-facility-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FacilityRequest = AuthenticatedRequest & { facilityId?: string };

function notAssigned(): DomainError {
  return new DomainError(
    HttpStatus.FORBIDDEN,
    'FACILITY_NOT_ASSIGNED',
    'No tienes una asignación vigente en el establecimiento elegido. Elige otro o pide la asignación a un administrador.',
  );
}

@Injectable()
export class AssignedFacilityGuard implements CanActivate {
  constructor(private readonly facilities: FacilitiesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FacilityRequest>();
    const header = request.headers[FACILITY_HEADER];
    const facilityId = Array.isArray(header) ? header[0] : header;

    if (request.user === undefined || facilityId === undefined || !UUID_PATTERN.test(facilityId)) {
      throw notAssigned();
    }

    if (!(await this.facilities.isAssigned(request.user.id, facilityId))) {
      throw notAssigned();
    }

    request.facilityId = facilityId;

    return true;
  }
}

export const CurrentFacility = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const facilityId = context.switchToHttp().getRequest<FacilityRequest>().facilityId;

  if (facilityId === undefined) {
    throw notAssigned();
  }

  return facilityId;
});
