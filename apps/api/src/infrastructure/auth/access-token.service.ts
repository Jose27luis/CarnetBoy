import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ROLES } from '@carnet/contracts';
import { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from './authenticated-user';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ACCESS_TOKEN_AUDIENCE = 'carnet:access';

const accessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(ROLES),
});

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: AuthenticatedUser, now: Date = new Date()): SignedAccessToken {
    const token = this.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS, audience: ACCESS_TOKEN_AUDIENCE },
    );

    return { token, expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000) };
  }

  verify(token: string): AuthenticatedUser {
    let decoded: unknown;

    try {
      decoded = this.jwt.verify<object>(token, { audience: ACCESS_TOKEN_AUDIENCE });
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new DomainError(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'La sesión expiró.');
      }

      throw DomainError.unauthenticated();
    }

    const payload = accessTokenPayloadSchema.safeParse(decoded);

    if (!payload.success) {
      throw DomainError.unauthenticated();
    }

    return { id: payload.data.sub, role: payload.data.role };
  }
}
