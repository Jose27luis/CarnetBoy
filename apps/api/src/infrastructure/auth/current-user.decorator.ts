import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedRequest, AuthenticatedUser } from './authenticated-user';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  if (request.user === undefined) {
    throw DomainError.unauthenticated();
  }

  return request.user;
});

export const ClientIp = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest<AuthenticatedRequest>().ip,
);
