import { Inject, Injectable } from '@nestjs/common';
import type { SecuritySettings } from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface SecurityChange {
  totpRequired: boolean;
  staffPasswordChange: boolean;
  expectedVersion: number;
}

const ROW_ID = 1;

@Injectable()
export class SecuritySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async current(): Promise<SecuritySettings> {
    const row = await this.prisma.securitySetting.findUnique({ where: { id: ROW_ID }, include: { updatedBy: { select: { fullName: true } } } });

    if (row === null) {
      return { totpRequired: this.env.TOTP_REQUIRED, staffPasswordChange: this.env.STAFF_PASSWORD_CHANGE, updatedAt: null, updatedByName: null, version: 0 };
    }

    return {
      totpRequired: row.totpRequired,
      staffPasswordChange: row.staffPasswordChange,
      updatedAt: row.updatedAt.toISOString(),
      updatedByName: row.updatedBy.fullName,
      version: row.version,
    };
  }

  async update(actor: AuthenticatedUser, change: SecurityChange, ip: string): Promise<SecuritySettings> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM security_settings WHERE id = ${ROW_ID} FOR UPDATE`;
      const row = await tx.securitySetting.findUnique({ where: { id: ROW_ID } });
      const before = row === null ? await this.current() : { totpRequired: row.totpRequired, staffPasswordChange: row.staffPasswordChange };

      if ((row?.version ?? 0) !== change.expectedVersion) {
        throw DomainError.conflict('VERSION_CONFLICT', 'Otra persona cambió la configuración. Recarga y vuelve a intentarlo.');
      }

      const data = { totpRequired: change.totpRequired, staffPasswordChange: change.staffPasswordChange, updatedById: actor.id };

      if (row === null) {
        await tx.securitySetting.create({ data: { id: ROW_ID, ...data } });
      } else {
        await tx.securitySetting.update({ where: { id: ROW_ID }, data: { ...data, version: { increment: 1 } } });
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'settings.security_updated',
        entity: 'account',
        entityId: actor.id,
        before: { totpRequired: before.totpRequired, staffPasswordChange: before.staffPasswordChange },
        after: { totpRequired: change.totpRequired, staffPasswordChange: change.staffPasswordChange },
        ip,
      });
    });

    return this.current();
  }
}
