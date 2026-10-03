import { Injectable } from '@nestjs/common';
import type { AuthTokens, CurrentAccount } from '@carnet/contracts';
import { DomainError } from '../../../common/errors/domain-error';
import type { Tx } from '../../../infrastructure/prisma/transaction';
import { isUniqueViolation } from '../../../infrastructure/prisma/unique-violation';
import { normalizeEmail } from '../credentials/email';
import { PasswordHasher } from '../credentials/password-hasher';
import { toCurrentAccount } from '../login/login.service';
import { SessionService } from '../sessions/session.service';

export interface NewGuardianAccount {
  dni: string;
  fullName: string;
  email: string | null;
  passwordHash: string;
}

export interface GuardianSession {
  account: CurrentAccount;
  tokens: AuthTokens;
}

@Injectable()
export class GuardianAccountsService {
  constructor(
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  hashPassword(password: string): Promise<string> {
    return this.passwords.hash(password);
  }

  async createAndSignIn(tx: Tx, input: NewGuardianAccount, now: Date = new Date()): Promise<GuardianSession> {
    try {
      const account = await tx.account.create({
        data: {
          dni: input.dni,
          email: input.email === null ? null : normalizeEmail(input.email),
          fullName: input.fullName,
          role: 'GUARDIAN',
          passwordHash: input.passwordHash,
          passwordChangeRequired: false,
        },
      });
      const tokens = await this.sessions.open(tx, { id: account.id, role: account.role }, now);

      return { account: toCurrentAccount(account), tokens };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw DomainError.conflict('EMAIL_TAKEN', 'Ese DNI o correo ya tiene una cuenta. Ingresa con tu contraseña.');
      }

      throw error;
    }
  }

  async closeAllSessions(tx: Tx, accountId: string, now: Date = new Date()): Promise<void> {
    await this.sessions.revokeAll(tx, accountId, now);
  }
}
