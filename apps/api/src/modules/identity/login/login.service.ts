import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AuthTokens,
  type CurrentAccount,
  type LoginStep,
  type Role,
  STAFF_ROLES,
  type TotpEnrollment,
} from '@carnet/contracts';
import type { Account } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../../infrastructure/prisma/transaction';
import { AuditService } from '../../audit/audit.service';
import { normalizeEmail } from '../credentials/email';
import { PasswordHasher } from '../credentials/password-hasher';
import { SessionService } from '../sessions/session.service';
import { TotpService } from '../totp/totp.service';
import { LoginChallengeService, type LoginChallengeStage } from './login-challenge.service';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export function toCurrentAccount(account: Pick<Account, 'id' | 'email' | 'fullName' | 'role'>): CurrentAccount {
  return { id: account.id, email: account.email, fullName: account.fullName, role: account.role };
}

function requiresTotp(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

@Injectable()
export class LoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    private readonly totp: TotpService,
    private readonly challenges: LoginChallengeService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, ip: string, now: Date = new Date()): Promise<LoginStep> {
    const account = await this.prisma.account.findUnique({ where: { email: normalizeEmail(email) } });

    if (account === null) {
      await this.passwords.spendDecoyVerification(password);
      throw this.invalidCredentials();
    }

    this.ensureNotLocked(account, now);

    if (!(await this.passwords.verify(account.passwordHash, password))) {
      await this.registerFailure(account.id, now);
      throw this.invalidCredentials();
    }

    this.ensureActive(account);
    await this.prisma.account.update({ where: { id: account.id }, data: { failedAttempts: 0 } });

    return this.nextStep(account, ip, now);
  }

  async changeInitialPassword(challengeToken: string, newPassword: string, ip: string, now: Date = new Date()): Promise<LoginStep> {
    const account = await this.challengedAccount(challengeToken, ['PASSWORD_CHANGE'], now);

    if (!account.passwordChangeRequired) {
      throw DomainError.conflict('PASSWORD_CHANGE_NOT_REQUIRED', 'La contraseña ya fue cambiada. Vuelve a ingresar.');
    }

    if (await this.passwords.verify(account.passwordHash, newPassword)) {
      throw DomainError.unprocessable('PASSWORD_REUSED', 'La nueva contraseña debe ser distinta de la temporal.');
    }

    const passwordHash = await this.passwords.hash(newPassword);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.account.update({
        where: { id: account.id },
        data: { passwordHash, passwordChangeRequired: false, version: { increment: 1 } },
      });
      await this.audit.record(tx, {
        actorId: account.id,
        action: 'account.password_changed',
        entity: 'account',
        entityId: account.id,
        ip,
      });

      return result;
    });

    return this.nextStep(updated, ip, now);
  }

  async startTotpEnrollment(challengeToken: string, now: Date = new Date()): Promise<TotpEnrollment> {
    const account = await this.challengedAccount(challengeToken, ['TOTP_ENROLLMENT'], now);

    if (account.totpEnabledAt !== null) {
      throw DomainError.conflict('VALIDATION_FAILED', 'El segundo factor ya está configurado.');
    }

    const secret = this.totp.createSecret();
    await this.prisma.account.update({
      where: { id: account.id },
      data: { totpSecretEncrypted: this.totp.encrypt(secret), totpLastTimeStep: null },
    });

    return { secret, qrSvg: await this.totp.qrSvg(account.email, secret) };
  }

  async verifyTotp(challengeToken: string, code: string, ip: string, now: Date = new Date()): Promise<LoginStep> {
    const account = await this.challengedAccount(challengeToken, ['TOTP', 'TOTP_ENROLLMENT'], now);

    if (account.totpSecretEncrypted === null) {
      throw DomainError.conflict('TOTP_NOT_ENROLLED', 'Primero escanea el código QR con tu aplicación de autenticación.');
    }

    const timeStep = this.totp.matchingTimeStep(account.totpSecretEncrypted, code, account.totpLastTimeStep, now);

    if (timeStep === null) {
      await this.registerFailure(account.id, now);
      throw this.invalidTotp();
    }

    const enrolling = account.totpEnabledAt === null;
    const tokens = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.account.updateMany({
        where: {
          id: account.id,
          OR: [{ totpLastTimeStep: null }, { totpLastTimeStep: { lt: timeStep } }],
        },
        data: {
          totpLastTimeStep: timeStep,
          failedAttempts: 0,
          ...(enrolling ? { totpEnabledAt: now } : {}),
        },
      });

      if (claimed.count === 0) {
        return null;
      }

      if (enrolling) {
        await this.audit.record(tx, {
          actorId: account.id,
          action: 'account.totp_enrolled',
          entity: 'account',
          entityId: account.id,
          ip,
        });
      }

      return this.openSession(tx, account, ip, now);
    });

    if (tokens === null) {
      throw this.invalidTotp();
    }

    return { step: 'AUTHENTICATED', account: toCurrentAccount(account), tokens };
  }

  async currentAccount(accountId: string): Promise<CurrentAccount> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });

    if (account === null) {
      throw DomainError.unauthenticated();
    }

    return toCurrentAccount(account);
  }

  private async nextStep(account: Account, ip: string, now: Date): Promise<LoginStep> {
    if (account.passwordChangeRequired) {
      return { step: 'PASSWORD_CHANGE_REQUIRED', ...this.challenges.issue(account.id, 'PASSWORD_CHANGE', now) };
    }

    if (requiresTotp(account.role)) {
      return account.totpEnabledAt === null
        ? { step: 'TOTP_ENROLLMENT_REQUIRED', ...this.challenges.issue(account.id, 'TOTP_ENROLLMENT', now) }
        : { step: 'TOTP_REQUIRED', ...this.challenges.issue(account.id, 'TOTP', now) };
    }

    const tokens = await this.prisma.$transaction((tx) => this.openSession(tx, account, ip, now));

    return { step: 'AUTHENTICATED', account: toCurrentAccount(account), tokens };
  }

  private async openSession(tx: Tx, account: Account, ip: string, now: Date): Promise<AuthTokens> {
    const tokens = await this.sessions.open(tx, { id: account.id, role: account.role }, now);
    await this.audit.record(tx, { actorId: account.id, action: 'session.opened', entity: 'account', entityId: account.id, ip });

    return tokens;
  }

  private async challengedAccount(challengeToken: string, stages: readonly LoginChallengeStage[], now: Date): Promise<Account> {
    const accountId = this.challenges.accountFor(challengeToken, stages);
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });

    if (account === null) {
      throw DomainError.unauthenticated();
    }

    this.ensureNotLocked(account, now);
    this.ensureActive(account);

    return account;
  }

  private ensureNotLocked(account: Account, now: Date): void {
    if (account.lockedUntil !== null && account.lockedUntil > now) {
      throw new DomainError(
        HttpStatus.LOCKED,
        'ACCOUNT_LOCKED',
        'Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Inténtalo en 15 minutos.',
      );
    }
  }

  private ensureActive(account: Account): void {
    if (account.status !== 'ACTIVE') {
      throw new DomainError(HttpStatus.FORBIDDEN, 'ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida. Comunícate con un administrador.');
    }
  }

  private async registerFailure(accountId: string, now: Date): Promise<void> {
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });

    if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.prisma.account.update({
        where: { id: accountId },
        data: { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) },
      });
    }
  }

  private invalidCredentials(): DomainError {
    return new DomainError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.');
  }

  private invalidTotp(): DomainError {
    return new DomainError(HttpStatus.UNAUTHORIZED, 'INVALID_TOTP_CODE', 'El código no es correcto o ya se usó. Espera el siguiente.');
  }
}
