import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ActivationChallenge, LoginStep } from '@carnet/contracts';
import { Redis } from 'ioredis';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { REDIS } from '../../infrastructure/redis/redis.module';
import { AuditService } from '../audit/audit.service';
import { GuardianAccountsService } from '../identity/accounts/guardian-accounts.service';
import { LoginChallengeService } from '../identity/login/login-challenge.service';
import { hashActivationCode } from './activation-code';
import { fullName } from './children.mapper';

export const MAX_ACTIVATION_FAILURES = 5;
export const ACTIVATION_LOCK_SECONDS = 15 * 60;

function failuresKey(dni: string): string {
  return `activation:failures:${dni}`;
}

function lockKey(dni: string): string {
  return `activation:locked:${dni}`;
}

function invalid(): DomainError {
  return new DomainError(
    HttpStatus.UNAUTHORIZED,
    'ACTIVATION_INVALID',
    'El DNI o el código no coinciden, o el código ya no es válido. Revisa los datos o pide un código nuevo en tu establecimiento.',
  );
}

export interface ActivationCompletion {
  challengeToken: string;
  password: string;
  email?: string;
}

@Injectable()
export class ActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly challenges: LoginChallengeService,
    private readonly guardianAccounts: GuardianAccountsService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async verify(dni: string, code: string, now: Date = new Date()): Promise<ActivationChallenge> {
    if ((await this.redis.exists(lockKey(dni))) === 1) {
      throw new DomainError(
        HttpStatus.TOO_MANY_REQUESTS,
        'ACTIVATION_LOCKED',
        'Hubo varios intentos fallidos con este DNI. Espera 15 minutos antes de volver a intentarlo.',
      );
    }

    const match = await this.prisma.activationCode.findFirst({
      where: {
        codeHash: hashActivationCode(code),
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        link: { status: 'PENDING', guardian: { dni, accountId: null } },
      },
      include: { link: { include: { guardian: true } } },
    });

    if (match === null) {
      await this.registerFailure(dni);
      throw invalid();
    }

    await this.redis.del(failuresKey(dni));

    const pending = await this.prisma.guardianLink.findMany({
      where: { guardianId: match.link.guardianId, status: { in: ['PENDING', 'EXPIRED'] } },
      include: { child: true },
      orderBy: { createdAt: 'asc' },
    });
    const guardian = match.link.guardian;

    return {
      ...this.challenges.issue(match.id, 'ACTIVATION', now),
      guardian: { givenNames: guardian.givenNames, paternalSurname: guardian.paternalSurname, maternalSurname: guardian.maternalSurname },
      children: pending.map(({ child }) => ({
        givenNames: child.givenNames,
        paternalSurname: child.paternalSurname,
        maternalSurname: child.maternalSurname,
      })),
    };
  }

  async complete(input: ActivationCompletion, ip: string, now: Date = new Date()): Promise<LoginStep> {
    const codeId = this.challenges.subjectFor(input.challengeToken, ['ACTIVATION']);
    const passwordHash = await this.guardianAccounts.hashPassword(input.password);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.activationCode.updateMany({
        where: { id: codeId, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });

      if (claimed.count === 0) {
        throw invalid();
      }

      const code = await tx.activationCode.findUniqueOrThrow({ where: { id: codeId }, include: { link: { include: { guardian: true } } } });
      const guardian = code.link.guardian;

      if (guardian.accountId !== null || code.link.status === 'REVOKED') {
        throw invalid();
      }

      const email = input.email?.trim().toLowerCase() ?? null;
      const session = await this.guardianAccounts.createAndSignIn(tx, { dni: guardian.dni, fullName: fullName(guardian), email, passwordHash }, now);
      await tx.guardian.update({
        where: { id: guardian.id },
        data: { accountId: session.account.id, ...(email === null ? {} : { email }) },
      });
      const activated = await tx.guardianLink.updateMany({
        where: { guardianId: guardian.id, status: { in: ['PENDING', 'EXPIRED'] } },
        data: { status: 'ACTIVE', version: { increment: 1 } },
      });
      await tx.activationCode.updateMany({
        where: { link: { guardianId: guardian.id }, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.record(tx, {
        actorId: session.account.id,
        action: 'guardian.activated',
        entity: 'guardian',
        entityId: guardian.id,
        after: { accountId: session.account.id, linksActivated: activated.count, codeId },
        ip,
      });

      return { step: 'AUTHENTICATED', account: session.account, tokens: session.tokens };
    });
  }

  private async registerFailure(dni: string): Promise<void> {
    const failures = await this.redis.incr(failuresKey(dni));

    if (failures === 1) {
      await this.redis.expire(failuresKey(dni), ACTIVATION_LOCK_SECONDS);
    }

    if (failures >= MAX_ACTIVATION_FAILURES) {
      await this.redis.set(lockKey(dni), '1', 'EX', ACTIVATION_LOCK_SECONDS);
      await this.redis.del(failuresKey(dni));
    }
  }
}
