import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenService } from './access-token.service';
import { IS_PUBLIC, REQUIRED_ROLES } from './auth-metadata';
import type { AuthenticatedRequest } from './authenticated-user';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, targets) === true;
    const header = request.headers.authorization;

    if (header === undefined) {
      if (isPublic) {
        return true;
      }

      throw DomainError.unauthenticated();
    }

    if (!header.startsWith(BEARER_PREFIX)) {
      throw DomainError.unauthenticated();
    }

    const claimed = this.accessTokens.verify(header.slice(BEARER_PREFIX.length));
    const account = await this.prisma.account.findUnique({
      where: { id: claimed.id },
      select: { id: true, role: true, status: true },
    });

    if (account === null || account.status !== 'ACTIVE' || account.role !== claimed.role) {
      throw DomainError.unauthenticated('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    }

    request.user = { id: account.id, role: account.role };

    const requiredRoles = this.reflector.getAllAndOverride<readonly Role[] | undefined>(REQUIRED_ROLES, targets);

    if (requiredRoles !== undefined && !requiredRoles.includes(account.role)) {
      throw DomainError.forbidden();
    }

    return true;
  }
}
