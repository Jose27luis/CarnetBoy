import { SetMetadata } from '@nestjs/common';
import type { Role } from '@carnet/contracts';

export const IS_PUBLIC = 'carnet:isPublic';
export const REQUIRED_ROLES = 'carnet:requiredRoles';

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);

export const RequireRoles = (...roles: [Role, ...Role[]]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_ROLES, roles);
