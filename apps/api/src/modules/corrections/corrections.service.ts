import { Injectable } from '@nestjs/common';
import type { ClinicalRecordType, CorrectionOutcome, CorrectionRequestItem, CorrectionStatus, PendingCorrection } from '@carnet/contracts';
import type { Prisma } from '@prisma/client';
import type { ClinicalRecordHandler, RecordSnapshot } from '../../common/clinical/record-handler';
import { canCorrectDirectly } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { violatedUniqueIndex } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { ClinicalRecordRegistry } from './clinical-record-registry';

export const ONE_OPEN_CORRECTION_INDEX = 'correction_requests_one_open';

export interface CorrectionInput {
  fields: unknown;
  reason: string;
}

const LIST_INCLUDE = {
  child: { select: { givenNames: true, paternalSurname: true, maternalSurname: true } },
  requestedBy: { select: { fullName: true } },
} satisfies Prisma.CorrectionRequestInclude;

const LIST_LIMIT = 200;

function alreadyRequested(): DomainError {
  return DomainError.conflict('CORRECTION_ALREADY_REQUESTED', 'Ese registro ya tiene una corrección pendiente de aprobación.');
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

@Injectable()
export class CorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly handlers: ClinicalRecordRegistry,
  ) {}

  async request(actor: AuthenticatedUser, type: ClinicalRecordType, recordId: string, input: CorrectionInput, ip: string, now: Date = new Date()): Promise<CorrectionOutcome> {
    const handler = this.handlers.of(type);
    const proposed = handler.parse(input.fields);
    const reason = input.reason.trim();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const snapshot = await this.currentSnapshot(tx, handler, recordId);
        const open = await tx.correctionRequest.findFirst({ where: { recordType: type, recordId, status: 'REQUESTED' }, select: { id: true } });

        if (open !== null) {
          throw alreadyRequested();
        }

        if (canCorrectDirectly(snapshot.recordedById, snapshot.recordedAt, actor.id, now)) {
          const newId = await handler.supersede(tx, { recordId, proposed, reason, recordedById: actor.id, now });
          await this.audit.record(tx, {
            actorId: actor.id,
            action: 'record.corrected',
            entity: 'child',
            entityId: snapshot.childId,
            before: { type, recordId, ...snapshot.data },
            after: { type, recordId: newId, ...proposed, reason },
            ip,
          });

          return { applied: true };
        }

        const created = await tx.correctionRequest.create({
          data: { recordType: type, recordId, childId: snapshot.childId, proposed: proposed as Prisma.InputJsonObject, reason, requestedById: actor.id, requestedAt: now },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'correction.requested',
          entity: 'child',
          entityId: snapshot.childId,
          after: { correctionId: created.id, type, recordId, ...proposed, reason },
          ip,
        });

        return { applied: false };
      });
    } catch (error) {
      if (violatedUniqueIndex(error) === ONE_OPEN_CORRECTION_INDEX) {
        throw alreadyRequested();
      }

      throw error;
    }
  }

  async pendingForChild(childId: string): Promise<PendingCorrection[]> {
    const rows = await this.prisma.correctionRequest.findMany({
      where: { childId, status: 'REQUESTED' },
      select: { id: true, recordType: true, recordId: true, requestedAt: true },
      orderBy: { requestedAt: 'desc' },
    });

    return rows.map((row) => ({ id: row.id, recordType: row.recordType, recordId: row.recordId, requestedAt: row.requestedAt.toISOString() }));
  }

  async list(status: CorrectionStatus): Promise<CorrectionRequestItem[]> {
    const rows = await this.prisma.correctionRequest.findMany({
      where: { status },
      include: LIST_INCLUDE,
      orderBy: { requestedAt: status === 'REQUESTED' ? 'asc' : 'desc' },
      take: LIST_LIMIT,
    });

    return Promise.all(
      rows.map(async (row) => {
        const snapshot = await this.handlers.of(row.recordType).snapshot(this.prisma, row.recordId);

        return {
          id: row.id,
          recordType: row.recordType,
          recordId: row.recordId,
          childId: row.childId,
          childName: `${row.child.givenNames} ${row.child.paternalSurname} ${row.child.maternalSurname}`,
          before: snapshot?.data ?? {},
          proposed: asRecord(row.proposed),
          reason: row.reason,
          requestedByName: row.requestedBy.fullName,
          requestedAt: row.requestedAt.toISOString(),
          status: row.status,
          rejectionReason: row.rejectionReason,
        };
      }),
    );
  }

  async approve(actor: AuthenticatedUser, correctionId: string, ip: string, now: Date = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const correction = await this.lockedPending(tx, correctionId);
      const handler = this.handlers.of(correction.recordType);
      const snapshot = await this.currentSnapshot(tx, handler, correction.recordId);
      const proposed = handler.parse(correction.proposed);
      const newId = await handler.supersede(tx, {
        recordId: correction.recordId,
        proposed,
        reason: correction.reason,
        recordedById: correction.requestedById,
        now,
      });
      await tx.correctionRequest.update({ where: { id: correction.id }, data: { status: 'APPROVED', resolvedById: actor.id, resolvedAt: now } });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'correction.approved',
        entity: 'child',
        entityId: correction.childId,
        before: { type: correction.recordType, recordId: correction.recordId, ...snapshot.data },
        after: { correctionId: correction.id, recordId: newId, ...proposed },
        ip,
      });
    });
  }

  async reject(actor: AuthenticatedUser, correctionId: string, rejectionReason: string, ip: string, now: Date = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const correction = await this.lockedPending(tx, correctionId);
      await tx.correctionRequest.update({
        where: { id: correction.id },
        data: { status: 'REJECTED', resolvedById: actor.id, resolvedAt: now, rejectionReason: rejectionReason.trim() },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'correction.rejected',
        entity: 'child',
        entityId: correction.childId,
        after: { correctionId: correction.id, rejectionReason: rejectionReason.trim() },
        ip,
      });
    });
  }

  private async currentSnapshot(tx: Tx, handler: ClinicalRecordHandler, recordId: string): Promise<RecordSnapshot> {
    const snapshot = await handler.snapshot(tx, recordId);

    if (snapshot === null) {
      throw DomainError.notFound('El registro no existe.');
    }

    if (!snapshot.isCurrent) {
      throw DomainError.conflict('RECORD_NOT_CURRENT', 'Ese registro ya fue corregido. Recarga la ficha.');
    }

    return snapshot;
  }

  private async lockedPending(tx: Tx, correctionId: string): Promise<Prisma.CorrectionRequestGetPayload<object>> {
    await tx.$queryRaw`SELECT id FROM correction_requests WHERE id = ${correctionId}::uuid FOR UPDATE`;
    const correction = await tx.correctionRequest.findUnique({ where: { id: correctionId } });

    if (correction === null) {
      throw DomainError.notFound('La solicitud de corrección no existe.');
    }

    if (correction.status !== 'REQUESTED') {
      throw DomainError.conflict('CORRECTION_NOT_PENDING', 'La solicitud ya fue resuelta.');
    }

    return correction;
  }
}
