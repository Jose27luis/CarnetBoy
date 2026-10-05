import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../config/env.module';
import type { Env } from '../../../config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { isUniqueViolation } from '../../../infrastructure/prisma/unique-violation';
import { AuditService } from '../../audit/audit.service';
import { normalizeEmail } from '../credentials/email';
import { PasswordHasher } from '../credentials/password-hasher';

const DEFAULT_ADMIN_NAME = 'Administrador';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { BOOTSTRAP_ADMIN_EMAIL: rawEmail, BOOTSTRAP_ADMIN_PASSWORD: password } = this.env;

    if (rawEmail === undefined || password === undefined) {
      return;
    }

    const email = normalizeEmail(rawEmail);

    if ((await this.prisma.account.findUnique({ where: { email }, select: { id: true } })) !== null) {
      return;
    }

    const passwordHash = await this.passwords.hash(password);

    try {
      await this.prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            email,
            fullName: this.env.BOOTSTRAP_ADMIN_NAME ?? DEFAULT_ADMIN_NAME,
            role: 'ADMIN',
            passwordHash,
            passwordChangeRequired: false,
          },
        });
        await this.audit.record(tx, {
          actorId: null,
          action: 'account.created',
          entity: 'account',
          entityId: account.id,
          after: { email, role: 'ADMIN', source: 'environment' },
        });
      });
      this.logger.log('Se creó el administrador inicial definido en las variables de entorno.');
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }
}
