import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppointmentType, CatalogKind, CatalogVersion, CatalogVersionDetail } from '@carnet/contracts';
import { Prisma, type CatalogVersion as CatalogVersionRow } from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { isUniqueViolation, violatedUniqueIndex } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { rangesOverlap } from './age-ranges';
import { fromDateColumn, toDateColumn } from './calendar-date-column';
import { toVaccine } from './vaccines.service';

export const ONE_CURRENT_VERSION_INDEX = 'catalog_versions_one_current';

export interface NewCatalogVersion {
  kind: CatalogKind;
  norm: string;
  copyFromId?: string;
}

export interface NewScheduledDose {
  vaccineId: string;
  doseNumber: number;
  recommendedAgeDays: number;
  maxAgeDays: number;
}

export interface NewHemoglobinThreshold {
  minAgeMonths: number;
  maxAgeMonths: number;
  normalFrom: string;
  mildFrom: string;
  moderateFrom: string;
}

export interface NewAppointmentInterval {
  appointmentType: AppointmentType;
  minAgeMonths: number;
  maxAgeMonths: number;
  intervalDays: number;
}

type EntryRelation = 'scheduledDoses' | 'hemoglobinThresholds' | 'appointmentIntervals';

const ENTRY_RELATION: Record<CatalogKind, EntryRelation> = {
  VACCINATION_SCHEDULE: 'scheduledDoses',
  HEMOGLOBIN_THRESHOLDS: 'hemoglobinThresholds',
  APPOINTMENT_INTERVALS: 'appointmentIntervals',
};

const versionReferenceSchema = z.object({ id: z.uuid() });

const detailInclude = {
  scheduledDoses: { include: { vaccine: true }, orderBy: [{ recommendedAgeDays: 'asc' }, { doseNumber: 'asc' }] },
  hemoglobinThresholds: { orderBy: { minAgeMonths: 'asc' } },
  appointmentIntervals: { orderBy: [{ appointmentType: 'asc' }, { minAgeMonths: 'asc' }] },
  _count: { select: { scheduledDoses: true, hemoglobinThresholds: true, appointmentIntervals: true } },
} satisfies Prisma.CatalogVersionInclude;

type DetailRow = Prisma.CatalogVersionGetPayload<{ include: typeof detailInclude }>;
type SummaryRow = CatalogVersionRow & { _count: Record<EntryRelation, number> };

function toCatalogVersion(row: SummaryRow): CatalogVersion {
  return {
    id: row.id,
    kind: row.kind,
    norm: row.norm,
    status: row.status,
    validFrom: fromDateColumn(row.validFrom),
    validTo: fromDateColumn(row.validTo),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    entryCount: row._count[ENTRY_RELATION[row.kind]],
    version: row.version,
  };
}

function toDetail(row: DetailRow): CatalogVersionDetail {
  return {
    ...toCatalogVersion(row),
    doses: row.scheduledDoses.map((dose) => ({
      id: dose.id,
      vaccine: toVaccine(dose.vaccine),
      doseNumber: dose.doseNumber,
      recommendedAgeDays: dose.recommendedAgeDays,
      maxAgeDays: dose.maxAgeDays,
    })),
    thresholds: row.hemoglobinThresholds.map((threshold) => ({
      id: threshold.id,
      minAgeMonths: threshold.minAgeMonths,
      maxAgeMonths: threshold.maxAgeMonths,
      normalFrom: threshold.normalFrom.toFixed(1),
      mildFrom: threshold.mildFrom.toFixed(1),
      moderateFrom: threshold.moderateFrom.toFixed(1),
    })),
    intervals: row.appointmentIntervals.map((interval) => ({
      id: interval.id,
      appointmentType: interval.appointmentType,
      minAgeMonths: interval.minAgeMonths,
      maxAgeMonths: interval.maxAgeMonths,
      intervalDays: interval.intervalDays,
    })),
  };
}

@Injectable()
export class CatalogVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async list(kind: CatalogKind): Promise<CatalogVersion[]> {
    const rows = await this.prisma.catalogVersion.findMany({
      where: { kind },
      include: { _count: detailInclude._count },
      orderBy: [{ status: 'asc' }, { validFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map(toCatalogVersion);
  }

  async detail(versionId: string): Promise<CatalogVersionDetail> {
    const row = await this.prisma.catalogVersion.findUnique({ where: { id: versionId }, include: detailInclude });

    if (row === null) {
      throw DomainError.notFound('La versión del catálogo no existe.');
    }

    return toDetail(row);
  }

  async versionInForce(kind: CatalogKind, date: string): Promise<string | null> {
    const day = toDateColumn(date);
    const row = await this.prisma.catalogVersion.findFirst({
      where: {
        kind,
        status: 'PUBLISHED',
        validFrom: { lte: day },
        OR: [{ validTo: null }, { validTo: { gt: day } }],
      },
      select: { id: true },
    });

    return row?.id ?? null;
  }

  create(actor: AuthenticatedUser, input: NewCatalogVersion, idempotencyKey: string, ip: string): Promise<CatalogVersionDetail> {
    return this.idempotency.run(
      { accountId: actor.id, key: idempotencyKey, operation: 'catalog_version.create', body: input, status: HttpStatus.CREATED },
      {
        reference: versionReferenceSchema,
        effect: async (tx) => {
          const source = input.copyFromId === undefined ? null : await this.sourceFor(tx, input.copyFromId, input.kind);
          const created = await tx.catalogVersion.create({
            data: { kind: input.kind, norm: input.norm.trim(), createdById: actor.id },
          });

          if (source !== null) {
            await this.copyEntries(tx, source, created.id);
          }

          await this.audit.record(tx, {
            actorId: actor.id,
            action: 'catalog_version.created',
            entity: 'catalog_version',
            entityId: created.id,
            after: { kind: created.kind, norm: created.norm, copyFromId: source?.id ?? null },
            ip,
          });

          return { id: created.id };
        },
        present: (reference) => this.detail(reference.id),
      },
    );
  }

  updateNorm(actor: AuthenticatedUser, versionId: string, norm: string, expectedVersion: number, ip: string): Promise<CatalogVersionDetail> {
    return this.changeDraft(actor, versionId, expectedVersion, ip, 'catalog_version.norm_changed', async (tx, draft) => {
      await tx.catalogVersion.update({ where: { id: draft.id }, data: { norm: norm.trim() } });

      return { before: { norm: draft.norm }, after: { norm: norm.trim() } };
    });
  }

  addDose(actor: AuthenticatedUser, versionId: string, dose: NewScheduledDose, expectedVersion: number, ip: string): Promise<CatalogVersionDetail> {
    if (dose.maxAgeDays < dose.recommendedAgeDays) {
      throw DomainError.validation({ maxAgeDays: ['La edad máxima no puede ser menor que la edad recomendada.'] });
    }

    return this.changeDraft(actor, versionId, expectedVersion, ip, 'catalog_version.entry_added', async (tx, draft) => {
      this.ensureKind(draft, 'VACCINATION_SCHEDULE');

      if ((await tx.vaccine.findUnique({ where: { id: dose.vaccineId } })) === null) {
        throw DomainError.notFound('La vacuna no existe.');
      }

      try {
        await tx.scheduledDose.create({ data: { catalogVersionId: draft.id, ...dose } });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw DomainError.conflict('CATALOG_ENTRY_DUPLICATED', 'Esa dosis de esa vacuna ya está en el esquema.');
        }

        throw error;
      }

      return { after: dose };
    });
  }

  addThreshold(
    actor: AuthenticatedUser,
    versionId: string,
    threshold: NewHemoglobinThreshold,
    expectedVersion: number,
    ip: string,
  ): Promise<CatalogVersionDetail> {
    this.ensureAgeRange(threshold.minAgeMonths, threshold.maxAgeMonths);
    const normalFrom = new Prisma.Decimal(threshold.normalFrom);
    const mildFrom = new Prisma.Decimal(threshold.mildFrom);
    const moderateFrom = new Prisma.Decimal(threshold.moderateFrom);

    if (!(normalFrom.greaterThan(mildFrom) && mildFrom.greaterThan(moderateFrom) && moderateFrom.greaterThan(0))) {
      throw DomainError.validation({
        normalFrom: ['Los umbrales deben ir de mayor a menor: sin anemia, leve y moderada, todos mayores que cero.'],
      });
    }

    return this.changeDraft(actor, versionId, expectedVersion, ip, 'catalog_version.entry_added', async (tx, draft) => {
      this.ensureKind(draft, 'HEMOGLOBIN_THRESHOLDS');
      const existing = await tx.hemoglobinThreshold.findMany({ where: { catalogVersionId: draft.id } });

      if (existing.some((entry) => rangesOverlap(entry, threshold))) {
        throw DomainError.conflict('CATALOG_RANGE_OVERLAP', 'El rango de edad se cruza con otro umbral de esta versión.');
      }

      await tx.hemoglobinThreshold.create({
        data: {
          catalogVersionId: draft.id,
          minAgeMonths: threshold.minAgeMonths,
          maxAgeMonths: threshold.maxAgeMonths,
          normalFrom,
          mildFrom,
          moderateFrom,
        },
      });

      return { after: threshold };
    });
  }

  addInterval(
    actor: AuthenticatedUser,
    versionId: string,
    interval: NewAppointmentInterval,
    expectedVersion: number,
    ip: string,
  ): Promise<CatalogVersionDetail> {
    this.ensureAgeRange(interval.minAgeMonths, interval.maxAgeMonths);

    return this.changeDraft(actor, versionId, expectedVersion, ip, 'catalog_version.entry_added', async (tx, draft) => {
      this.ensureKind(draft, 'APPOINTMENT_INTERVALS');
      const existing = await tx.appointmentInterval.findMany({
        where: { catalogVersionId: draft.id, appointmentType: interval.appointmentType },
      });

      if (existing.some((entry) => rangesOverlap(entry, interval))) {
        throw DomainError.conflict('CATALOG_RANGE_OVERLAP', 'El rango de edad se cruza con otro intervalo del mismo tipo de cita.');
      }

      await tx.appointmentInterval.create({ data: { catalogVersionId: draft.id, ...interval } });

      return { after: interval };
    });
  }

  removeEntry(actor: AuthenticatedUser, versionId: string, entryId: string, expectedVersion: number, ip: string): Promise<CatalogVersionDetail> {
    return this.changeDraft(actor, versionId, expectedVersion, ip, 'catalog_version.entry_removed', async (tx, draft) => {
      const where = { id: entryId, catalogVersionId: draft.id };
      const removed =
        draft.kind === 'VACCINATION_SCHEDULE'
          ? await tx.scheduledDose.deleteMany({ where })
          : draft.kind === 'HEMOGLOBIN_THRESHOLDS'
            ? await tx.hemoglobinThreshold.deleteMany({ where })
            : await tx.appointmentInterval.deleteMany({ where });

      if (removed.count === 0) {
        throw DomainError.notFound('La entrada no existe en esta versión.');
      }

      return { before: { entryId } };
    });
  }

  async publish(actor: AuthenticatedUser, versionId: string, validFrom: string, expectedVersion: number, ip: string, now: Date = new Date()): Promise<CatalogVersionDetail> {
    const start = toDateColumn(validFrom);

    try {
      await this.prisma.$transaction(async (tx) => {
        const draft = await this.lockedDraft(tx, versionId, expectedVersion);
        const entries = await tx.catalogVersion.findUniqueOrThrow({
          where: { id: draft.id },
          include: { _count: detailInclude._count },
        });

        if (entries._count[ENTRY_RELATION[draft.kind]] === 0) {
          throw DomainError.unprocessable('CATALOG_EMPTY', 'No se puede publicar una versión sin entradas.');
        }

        const [current] = await tx.$queryRaw<{ id: string; valid_from: Date }[]>`
          SELECT id, valid_from FROM catalog_versions
          WHERE kind = ${draft.kind}::"CatalogKind" AND status = 'PUBLISHED' AND valid_to IS NULL
          FOR UPDATE
        `;

        if (current !== undefined) {
          if (start <= current.valid_from) {
            throw DomainError.unprocessable(
              'VALIDITY_NOT_AFTER_CURRENT',
              `La vigencia debe empezar después del ${fromDateColumn(current.valid_from)}, fecha de la versión vigente.`,
            );
          }

          await tx.catalogVersion.update({ where: { id: current.id }, data: { validTo: start, version: { increment: 1 } } });
        }

        await tx.catalogVersion.update({
          where: { id: draft.id },
          data: { status: 'PUBLISHED', validFrom: start, publishedAt: now, version: { increment: 1 } },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'catalog_version.published',
          entity: 'catalog_version',
          entityId: draft.id,
          after: { kind: draft.kind, validFrom, replaces: current?.id ?? null },
          ip,
        });
      });
    } catch (error) {
      if (violatedUniqueIndex(error) === ONE_CURRENT_VERSION_INDEX) {
        throw DomainError.conflict('VERSION_CONFLICT', 'Otra versión se publicó al mismo tiempo. Recarga y vuelve a intentarlo.');
      }

      throw error;
    }

    return this.detail(versionId);
  }

  private async changeDraft(
    actor: AuthenticatedUser,
    versionId: string,
    expectedVersion: number,
    ip: string,
    action: string,
    apply: (tx: Tx, draft: CatalogVersionRow) => Promise<{ before?: unknown; after?: unknown }>,
  ): Promise<CatalogVersionDetail> {
    await this.prisma.$transaction(async (tx) => {
      const draft = await this.lockedDraft(tx, versionId, expectedVersion);
      const change = await apply(tx, draft);
      await tx.catalogVersion.update({ where: { id: draft.id }, data: { version: { increment: 1 } } });
      await this.audit.record(tx, {
        actorId: actor.id,
        action,
        entity: 'catalog_version',
        entityId: draft.id,
        before: change.before,
        after: change.after,
        ip,
      });
    });

    return this.detail(versionId);
  }

  private async lockedDraft(tx: Tx, versionId: string, expectedVersion: number): Promise<CatalogVersionRow> {
    await tx.$queryRaw`SELECT id FROM catalog_versions WHERE id = ${versionId}::uuid FOR UPDATE`;
    const version = await tx.catalogVersion.findUnique({ where: { id: versionId } });

    if (version === null) {
      throw DomainError.notFound('La versión del catálogo no existe.');
    }

    if (version.status !== 'DRAFT') {
      throw DomainError.conflict('CATALOG_NOT_DRAFT', 'Una versión publicada no se modifica. Crea una versión nueva a partir de ella.');
    }

    if (version.version !== expectedVersion) {
      throw DomainError.conflict('VERSION_CONFLICT', 'Otra persona modificó esta versión. Recarga y vuelve a intentarlo.');
    }

    return version;
  }

  private async sourceFor(tx: Tx, sourceId: string, kind: CatalogKind): Promise<CatalogVersionRow> {
    const source = await tx.catalogVersion.findUnique({ where: { id: sourceId } });

    if (source === null || source.kind !== kind) {
      throw DomainError.notFound('La versión de origen no existe o es de otro catálogo.');
    }

    return source;
  }

  private async copyEntries(tx: Tx, source: CatalogVersionRow, targetId: string): Promise<void> {
    if (source.kind === 'VACCINATION_SCHEDULE') {
      const doses = await tx.scheduledDose.findMany({ where: { catalogVersionId: source.id } });
      await tx.scheduledDose.createMany({
        data: doses.map(({ vaccineId, doseNumber, recommendedAgeDays, maxAgeDays }) => ({
          catalogVersionId: targetId,
          vaccineId,
          doseNumber,
          recommendedAgeDays,
          maxAgeDays,
        })),
      });
    } else if (source.kind === 'HEMOGLOBIN_THRESHOLDS') {
      const thresholds = await tx.hemoglobinThreshold.findMany({ where: { catalogVersionId: source.id } });
      await tx.hemoglobinThreshold.createMany({
        data: thresholds.map(({ minAgeMonths, maxAgeMonths, normalFrom, mildFrom, moderateFrom }) => ({
          catalogVersionId: targetId,
          minAgeMonths,
          maxAgeMonths,
          normalFrom,
          mildFrom,
          moderateFrom,
        })),
      });
    } else {
      const intervals = await tx.appointmentInterval.findMany({ where: { catalogVersionId: source.id } });
      await tx.appointmentInterval.createMany({
        data: intervals.map(({ appointmentType, minAgeMonths, maxAgeMonths, intervalDays }) => ({
          catalogVersionId: targetId,
          appointmentType,
          minAgeMonths,
          maxAgeMonths,
          intervalDays,
        })),
      });
    }
  }

  private ensureKind(version: CatalogVersionRow, kind: CatalogKind): void {
    if (version.kind !== kind) {
      throw DomainError.unprocessable('VALIDATION_FAILED', 'Esta entrada no corresponde al tipo de catálogo de la versión.');
    }
  }

  private ensureAgeRange(minAgeMonths: number, maxAgeMonths: number): void {
    if (maxAgeMonths < minAgeMonths) {
      throw DomainError.validation({ maxAgeMonths: ['La edad máxima no puede ser menor que la edad mínima.'] });
    }
  }
}
