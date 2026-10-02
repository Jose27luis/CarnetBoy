import { HttpStatus, Injectable } from '@nestjs/common';
import type { StaffAccount, StaffAccountCreated, StaffRole, TemporaryPasswordIssued } from '@carnet/contracts';
import type { Account, Prisma } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../../infrastructure/prisma/transaction';
import { isUniqueViolation } from '../../../infrastructure/prisma/unique-violation';
import { AuditService } from '../../audit/audit.service';
import { PasswordHasher } from '../credentials/password-hasher';
import { generateTemporaryPassword } from '../credentials/temporary-password';
import { normalizeEmail } from '../credentials/email';
import { SessionService } from '../sessions/session.service';

export interface NewStaffAccount {
  email: string;
  fullName: string;
  role: StaffRole;
}

function isStaffAccount(account: Account): account is Account & { role: StaffRole } {
  return account.role === 'ADMIN' || account.role === 'DIGITIZER';
}

export function toStaffAccount(account: Account & { role: StaffRole }, now: Date = new Date()): StaffAccount {
  return {
    locked: account.lockedUntil !== null && account.lockedUntil > now,
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    status: account.status,
    totpEnabled: account.totpEnabledAt !== null,
    passwordChangeRequired: account.passwordChangeRequired,
    lockedUntil: account.lockedUntil?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
  };
}

function snapshot(account: Account): Record<string, unknown> {
  return {
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    status: account.status,
    totpEnabled: account.totpEnabledAt !== null,
    passwordChangeRequired: account.passwordChangeRequired,
  };
}

@Injectable()
export class StaffAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<StaffAccount[]> {
    const accounts = await this.prisma.account.findMany({
      where: { role: { in: ['ADMIN', 'DIGITIZER'] } },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
    });

    const now = new Date();

    return accounts.filter(isStaffAccount).map((account) => toStaffAccount(account, now));
  }

  async create(actor: AuthenticatedUser, input: NewStaffAccount, ip: string): Promise<StaffAccountCreated> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.passwords.hash(temporaryPassword);

    try {
      const account = await this.prisma.$transaction(async (tx) => {
        const created = await tx.account.create({
          data: {
            email: normalizeEmail(input.email),
            fullName: input.fullName.trim(),
            role: input.role,
            passwordHash,
            passwordChangeRequired: true,
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'account.created',
          entity: 'account',
          entityId: created.id,
          after: snapshot(created),
          ip,
        });

        return created;
      });

      return { account: toStaffAccount(this.requireStaff(account)), temporaryPassword };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw DomainError.conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.');
      }

      throw error;
    }
  }

  suspend(actor: AuthenticatedUser, accountId: string, ip: string, now: Date = new Date()): Promise<StaffAccount> {
    return this.change(actor, accountId, ip, 'account.suspended', async (tx, account) => {
      if (account.role === 'ADMIN' && account.status === 'ACTIVE') {
        await this.ensureAnotherActiveAdmin(tx, account.id);
      }

      await this.sessions.revokeAll(tx, account.id, now);

      return { status: 'SUSPENDED' };
    });
  }

  reactivate(actor: AuthenticatedUser, accountId: string, ip: string): Promise<StaffAccount> {
    return this.change(actor, accountId, ip, 'account.reactivated', () => Promise.resolve({ status: 'ACTIVE' }));
  }

  resetTotp(actor: AuthenticatedUser, accountId: string, ip: string, now: Date = new Date()): Promise<StaffAccount> {
    return this.change(actor, accountId, ip, 'account.totp_reset', async (tx, account) => {
      await this.sessions.revokeAll(tx, account.id, now);

      return { totpSecretEncrypted: null, totpEnabledAt: null, totpLastTimeStep: null };
    });
  }

  async resetPassword(actor: AuthenticatedUser, accountId: string, ip: string, now: Date = new Date()): Promise<TemporaryPasswordIssued> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.passwords.hash(temporaryPassword);

    await this.change(actor, accountId, ip, 'account.password_reset', async (tx, account) => {
      await this.sessions.revokeAll(tx, account.id, now);

      return { passwordHash, passwordChangeRequired: true, failedAttempts: 0, lockedUntil: null };
    });

    return { temporaryPassword };
  }

  async staffRoleOf(accountId: string): Promise<StaffRole | null> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });

    return account !== null && isStaffAccount(account) ? account.role : null;
  }

  private async change(
    actor: AuthenticatedUser,
    accountId: string,
    ip: string,
    action: string,
    decide: (tx: Tx, account: Account) => Promise<Prisma.AccountUpdateInput>,
  ): Promise<StaffAccount> {
    if (actor.id === accountId) {
      throw DomainError.conflict('CANNOT_CHANGE_OWN_ACCOUNT', 'No puedes aplicar esta acción sobre tu propia cuenta.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;
      const account = await tx.account.findUnique({ where: { id: accountId } });

      if (account === null || !isStaffAccount(account)) {
        throw DomainError.notFound('La cuenta no existe.');
      }

      const data = await decide(tx, account);
      const result = await tx.account.update({ where: { id: account.id }, data: { ...data, version: { increment: 1 } } });
      await this.audit.record(tx, {
        actorId: actor.id,
        action,
        entity: 'account',
        entityId: account.id,
        before: snapshot(account),
        after: snapshot(result),
        ip,
      });

      return result;
    });

    return toStaffAccount(this.requireStaff(updated));
  }

  private async ensureAnotherActiveAdmin(tx: Tx, excludedAccountId: string): Promise<void> {
    const admins = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM accounts WHERE role = 'ADMIN' AND status = 'ACTIVE' AND id <> ${excludedAccountId}::uuid FOR UPDATE
    `;

    if (admins.length === 0) {
      throw new DomainError(HttpStatus.CONFLICT, 'LAST_ACTIVE_ADMIN', 'Debe quedar al menos un administrador activo.');
    }
  }

  private requireStaff(account: Account): Account & { role: StaffRole } {
    if (!isStaffAccount(account)) {
      throw new Error(`La cuenta ${account.id} no pertenece al personal.`);
    }

    return account;
  }
}
