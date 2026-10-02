import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@carnet/contracts';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { DomainError } from '../../../common/errors/domain-error';
import { AccessTokenService } from '../../../infrastructure/auth/access-token.service';
import type { AuthenticatedUser } from '../../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../../infrastructure/prisma/transaction';
import { REDIS } from '../../../infrastructure/redis/redis.module';
import {
  REFRESH_TOKEN_TTL_MS,
  ROTATION_GRACE_SECONDS,
  generateRefreshToken,
  hashRefreshToken,
  rotationGraceKey,
} from './refresh-token';

const authTokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
});

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokens: AccessTokenService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async open(tx: Tx, user: AuthenticatedUser, now: Date = new Date()): Promise<AuthTokens> {
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    await tx.session.create({
      data: { accountId: user.id, refreshTokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiresAt },
    });

    const access = this.accessTokens.sign(user, now);

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    };
  }

  async rotate(refreshToken: string, now: Date = new Date()): Promise<AuthTokens> {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const outcome = await this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { refreshTokenHash },
        include: { account: { select: { id: true, role: true, status: true } } },
      });

      if (session === null) {
        return { kind: 'invalid' } as const;
      }

      if (session.expiresAt <= now) {
        return { kind: 'expired' } as const;
      }

      if (session.account.status !== 'ACTIVE') {
        return { kind: 'invalid' } as const;
      }

      const revoked = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (revoked.count === 0) {
        return { kind: 'already_rotated', accountId: session.accountId } as const;
      }

      const tokens = await this.open(tx, { id: session.account.id, role: session.account.role }, now);
      await this.redis.set(rotationGraceKey(refreshTokenHash), JSON.stringify(tokens), 'EX', ROTATION_GRACE_SECONDS);

      return { kind: 'rotated', tokens } as const;
    });

    switch (outcome.kind) {
      case 'rotated':
        return outcome.tokens;
      case 'already_rotated': {
        const recent = await this.recentRotation(refreshTokenHash);

        if (recent !== null) {
          return recent;
        }

        await this.revokeAll(this.prisma, outcome.accountId, now);
        throw DomainError.unauthenticated('La sesión fue cerrada por seguridad. Inicia sesión de nuevo.');
      }
      case 'expired':
        throw new DomainError(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'La sesión expiró. Inicia sesión de nuevo.');
      case 'invalid':
        throw DomainError.unauthenticated();
    }
  }

  async close(refreshToken: string, now: Date = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAll(tx: Tx, accountId: string, now: Date = new Date()): Promise<void> {
    await tx.session.updateMany({ where: { accountId, revokedAt: null }, data: { revokedAt: now } });
  }

  private async recentRotation(refreshTokenHash: string): Promise<AuthTokens | null> {
    const cached = await this.redis.get(rotationGraceKey(refreshTokenHash));

    if (cached === null) {
      return null;
    }

    const parsed = authTokensSchema.safeParse(JSON.parse(cached));

    return parsed.success ? parsed.data : null;
  }
}
