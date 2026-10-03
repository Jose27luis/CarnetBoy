import { Injectable } from '@nestjs/common';
import {
  type ActivationCodeIssued,
  type AdminLinkItem,
  CONSENT_VERSION,
  type Guardian,
  type LinkCreated,
  type Relationship,
} from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { violatedUniqueIndex } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { GuardianAccountsService } from '../identity/accounts/guardian-accounts.service';
import { activationCodeExpiry, generateActivationCode, hashActivationCode } from './activation-code';
import type { ActorContext } from './children.service';
import { LINK_INCLUDE, toChildSummary, toGuardian, toGuardianLink } from './children.mapper';
import { expireStaleLinks } from './stale-links';

export const ONE_OPEN_LINK_INDEX = 'guardian_links_one_open';

export interface GuardianDetails {
  givenNames: string;
  paternalSurname: string;
  maternalSurname: string;
  phone?: string;
  email?: string;
}

export interface NewLink {
  guardianDni: string;
  guardian?: GuardianDetails;
  relationship: Relationship;
  consentAccepted: boolean;
  consentVersion: string;
}

export interface Revocation {
  reason: string;
  document: string;
  expectedVersion: number;
}

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly guardianAccounts: GuardianAccountsService,
  ) {}

  async guardianByDni(dni: string): Promise<Guardian | null> {
    const guardian = await this.prisma.guardian.findUnique({ where: { dni } });

    return guardian === null ? null : toGuardian(guardian);
  }

  async create(context: ActorContext, childId: string, input: NewLink, now: Date = new Date()): Promise<LinkCreated> {
    if (!input.consentAccepted || input.consentVersion !== CONSENT_VERSION) {
      throw DomainError.unprocessable('CONSENT_REQUIRED', 'El apoderado debe aceptar el consentimiento vigente antes de vincularlo.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if ((await tx.child.findUnique({ where: { id: childId }, select: { id: true } })) === null) {
          throw DomainError.notFound('El niño no existe.');
        }

        const guardian = await this.upsertGuardian(tx, input);
        const status = guardian.accountId === null ? 'PENDING' : 'ACTIVE';
        const link = await tx.guardianLink.create({
          data: {
            childId,
            guardianId: guardian.id,
            relationship: input.relationship,
            status,
            consentVersion: CONSENT_VERSION,
            consentAt: now,
            createdById: context.actor.id,
            facilityId: context.facilityId,
          },
        });
        const code = status === 'PENDING' ? await this.issueCode(tx, link.id, context.actor.id, now) : null;

        await this.audit.record(tx, {
          actorId: context.actor.id,
          action: 'link.created',
          entity: 'guardian_link',
          entityId: link.id,
          after: { childId, guardianId: guardian.id, relationship: input.relationship, status, consentVersion: CONSENT_VERSION, facilityId: context.facilityId },
          ip: context.ip,
        });

        const created = await tx.guardianLink.findUniqueOrThrow({ where: { id: link.id }, include: LINK_INCLUDE });

        return {
          link: toGuardianLink(created),
          activationCode: code?.activationCode ?? null,
          codeExpiresAt: code?.codeExpiresAt ?? null,
        };
      });
    } catch (error) {
      if (violatedUniqueIndex(error) === ONE_OPEN_LINK_INDEX) {
        throw DomainError.conflict('LINK_ALREADY_EXISTS', 'Este apoderado ya está vinculado a este niño.');
      }

      throw error;
    }
  }

  async reissue(context: ActorContext, linkId: string, now: Date = new Date()): Promise<ActivationCodeIssued> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM guardian_links WHERE id = ${linkId}::uuid FOR UPDATE`;
      const link = await tx.guardianLink.findUnique({ where: { id: linkId } });

      if (link === null) {
        throw DomainError.notFound('El vínculo no existe.');
      }

      if (link.status !== 'PENDING' && link.status !== 'EXPIRED') {
        throw DomainError.conflict('LINK_NOT_PENDING', 'Solo se reemite el código de un vínculo pendiente o vencido.');
      }

      await tx.activationCode.updateMany({ where: { linkId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
      const code = await this.issueCode(tx, linkId, context.actor.id, now);
      await tx.guardianLink.update({ where: { id: linkId }, data: { status: 'PENDING', version: { increment: 1 } } });
      await this.audit.record(tx, {
        actorId: context.actor.id,
        action: 'link.code_reissued',
        entity: 'guardian_link',
        entityId: linkId,
        before: { status: link.status },
        after: { status: 'PENDING', facilityId: context.facilityId },
        ip: context.ip,
      });

      return code;
    });
  }

  async adminSearch(document: string, now: Date = new Date()): Promise<AdminLinkItem[]> {
    const guardian = await this.prisma.guardian.findUnique({ where: { dni: document }, select: { id: true } });
    const child = await this.prisma.child.findFirst({ where: { OR: [{ dni: document }, { cnv: document }] }, select: { id: true } });

    if (guardian !== null) {
      await expireStaleLinks(this.prisma, { guardianId: guardian.id }, now);
    }

    if (child !== null) {
      await expireStaleLinks(this.prisma, { childId: child.id }, now);
    }

    const rows = await this.prisma.guardianLink.findMany({
      where: {
        OR: [...(guardian === null ? [] : [{ guardianId: guardian.id }]), ...(child === null ? [] : [{ childId: child.id }])],
      },
      include: { ...LINK_INCLUDE, child: true },
      orderBy: { createdAt: 'desc' },
    });

    return guardian === null && child === null
      ? []
      : rows.map((row) => {
          const link = toGuardianLink(row);

          return {
            id: link.id,
            status: link.status,
            relationship: link.relationship,
            child: toChildSummary(row.child),
            guardian: link.guardian,
            facilityName: link.facilityName,
            createdAt: link.createdAt,
            revokedAt: link.revokedAt,
            revocationReason: link.revocationReason,
            version: link.version,
          };
        });
  }

  async revoke(actor: AuthenticatedUser, linkId: string, revocation: Revocation, ip: string, now: Date = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const link = await tx.guardianLink.findUnique({ where: { id: linkId }, include: { guardian: true } });

      if (link === null) {
        throw DomainError.notFound('El vínculo no existe.');
      }

      if (link.status === 'REVOKED') {
        throw DomainError.conflict('LINK_NOT_PENDING', 'El vínculo ya estaba revocado.');
      }

      const revoked = await tx.guardianLink.updateMany({
        where: { id: linkId, version: revocation.expectedVersion, status: { not: 'REVOKED' } },
        data: {
          status: 'REVOKED',
          revokedAt: now,
          revokedById: actor.id,
          revocationReason: revocation.reason.trim(),
          revocationDocument: revocation.document.trim(),
          version: { increment: 1 },
        },
      });

      if (revoked.count === 0) {
        throw DomainError.conflict('VERSION_CONFLICT', 'El vínculo cambió mientras lo revisabas. Recarga y vuelve a intentarlo.');
      }

      await tx.activationCode.updateMany({ where: { linkId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });

      const accountId = link.guardian.accountId;
      const remaining = accountId === null ? 0 : await tx.guardianLink.count({ where: { guardianId: link.guardianId, status: 'ACTIVE' } });

      if (accountId !== null && remaining === 0) {
        await this.guardianAccounts.closeAllSessions(tx, accountId, now);
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'link.revoked',
        entity: 'guardian_link',
        entityId: linkId,
        before: { status: link.status },
        after: { status: 'REVOKED', reason: revocation.reason.trim(), document: revocation.document.trim(), sessionsClosed: accountId !== null && remaining === 0 },
        ip,
      });
    });
  }

  private async upsertGuardian(tx: Tx, input: NewLink): Promise<{ id: string; accountId: string | null }> {
    const existing = await tx.guardian.findUnique({ where: { dni: input.guardianDni } });
    const details = input.guardian;

    if (existing !== null) {
      if (details?.phone !== undefined || details?.email !== undefined) {
        await tx.guardian.update({
          where: { id: existing.id },
          data: {
            ...(details.phone === undefined ? {} : { phone: details.phone }),
            ...(details.email === undefined ? {} : { email: details.email.trim().toLowerCase() }),
          },
        });
      }

      return existing;
    }

    if (details === undefined) {
      throw DomainError.validation({ 'guardian.givenNames': ['El apoderado no está registrado. Completa sus nombres y apellidos.'] });
    }

    return tx.guardian.create({
      data: {
        dni: input.guardianDni,
        givenNames: details.givenNames.trim(),
        paternalSurname: details.paternalSurname.trim(),
        maternalSurname: details.maternalSurname.trim(),
        phone: details.phone ?? null,
        email: details.email?.trim().toLowerCase() ?? null,
      },
    });
  }

  private async issueCode(tx: Tx, linkId: string, issuedById: string, now: Date): Promise<ActivationCodeIssued> {
    const activationCode = generateActivationCode();
    const expiresAt = activationCodeExpiry(now);

    await tx.activationCode.create({
      data: { linkId, codeHash: hashActivationCode(activationCode), expiresAt, issuedById, createdAt: now },
    });

    return { activationCode, codeExpiresAt: expiresAt.toISOString() };
  }
}
