import { HttpStatus, Injectable } from '@nestjs/common';
import { adjustHemoglobin, ageInCompletedMonths, classifyAnemia, parseCalendarDate } from '@carnet/clinical';
import type { HemoglobinTestRecord } from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { markAppointmentAttended } from '../../common/clinical/appointment-attendance';
import type { ClinicalRecordHandler, RecordSnapshot, Supersession } from '../../common/clinical/record-handler';
import { validRecordDate } from '../../common/clinical/record-date';
import { dateColumn, RECORD_META_INCLUDE, toRecordMeta } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { CatalogVersionsService } from '../catalogs/catalog-versions.service';
import { type ActorContext, type ChildBasics, ChildrenService } from '../children/children.service';
import { FacilitiesService } from '../facilities/facilities.service';

export interface NewHemoglobinTest {
  testedOn: string;
  observed: string;
}

const TEST_INCLUDE = { ...RECORD_META_INCLUDE, thresholdVersion: { select: { norm: true } } } satisfies Prisma.HemoglobinTestInclude;
type TestRow = Prisma.HemoglobinTestGetPayload<{ include: typeof TEST_INCLUDE }>;
type Derived = Omit<Prisma.HemoglobinTestUncheckedCreateInput, 'childId' | 'facilityId' | 'recordedById'>;

const referenceSchema = z.object({ id: z.uuid() });
const correctionSchema = z.object({
  testedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observed: z.string().regex(/^\d{1,2}(\.\d)?$/),
});
const OBSERVED_MIN = 3;
const OBSERVED_MAX = 25;

export function toHemoglobinRecord(row: TestRow, viewerId: string, now: Date): HemoglobinTestRecord {
  return {
    ...toRecordMeta(row, viewerId, now),
    testedOn: dateColumn(row.testedOn),
    observed: row.observed.toFixed(1),
    altitudeMeters: row.altitudeMeters,
    adjustment: row.adjustment.toFixed(1),
    adjusted: row.adjusted.toFixed(1),
    ageMonths: row.ageMonths,
    classification: row.classification,
    thresholdNorm: row.thresholdVersion.norm,
  };
}

@Injectable()
export class HemoglobinService implements ClinicalRecordHandler {
  readonly type = 'HEMOGLOBIN_TEST' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly catalogs: CatalogVersionsService,
    private readonly children: ChildrenService,
    private readonly facilities: FacilitiesService,
  ) {}

  async list(viewerId: string, childId: string, now: Date): Promise<HemoglobinTestRecord[]> {
    const rows = await this.prisma.hemoglobinTest.findMany({
      where: { childId, isCurrent: true },
      include: TEST_INCLUDE,
      orderBy: [{ testedOn: 'desc' }, { recordedAt: 'desc' }],
    });

    return rows.map((row) => toHemoglobinRecord(row, viewerId, now));
  }

  async record(context: ActorContext, childId: string, input: NewHemoglobinTest, idempotencyKey: string, now: Date = new Date()): Promise<HemoglobinTestRecord> {
    const child = await this.children.basics(childId);
    const altitude = await this.facilities.altitudeOf(context.facilityId);
    const derived = await this.derive(child, input, altitude, now);

    return this.idempotency.run(
      { accountId: context.actor.id, key: idempotencyKey, operation: 'hemoglobin_test.record', body: { childId, ...input }, status: HttpStatus.CREATED },
      {
        reference: referenceSchema,
        effect: async (tx) => {
          const created = await tx.hemoglobinTest.create({
            data: { ...derived, childId, facilityId: context.facilityId, recordedById: context.actor.id, recordedAt: now },
          });
          await markAppointmentAttended(tx, { childId, type: 'HEMOGLOBIN_TEST', attendedOn: parseCalendarDate(input.testedOn), actorId: context.actor.id, now });
          await this.audit.record(tx, {
            actorId: context.actor.id,
            action: 'hemoglobin_test.recorded',
            entity: 'child',
            entityId: childId,
            after: { hemoglobinTestId: created.id, testedOn: input.testedOn, observed: input.observed, altitudeMeters: altitude, classification: derived.classification },
            ip: context.ip,
          });

          return { id: created.id };
        },
        present: async (reference) =>
          toHemoglobinRecord(await this.prisma.hemoglobinTest.findUniqueOrThrow({ where: { id: reference.id }, include: TEST_INCLUDE }), context.actor.id, now),
      },
      now,
    );
  }

  async snapshot(tx: Tx, recordId: string): Promise<RecordSnapshot | null> {
    const row = await tx.hemoglobinTest.findUnique({ where: { id: recordId } });

    return row === null
      ? null
      : {
          childId: row.childId,
          recordedById: row.recordedById,
          recordedAt: row.recordedAt,
          isCurrent: row.isCurrent,
          data: { testedOn: dateColumn(row.testedOn), observed: row.observed.toFixed(1), altitudeMeters: row.altitudeMeters },
        };
  }

  parse(fields: unknown): Record<string, unknown> {
    const parsed = correctionSchema.safeParse(fields);

    if (!parsed.success) {
      throw DomainError.validation({ fields: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) });
    }

    return parsed.data;
  }

  async supersede(tx: Tx, supersession: Supersession): Promise<string> {
    const fields = correctionSchema.parse(supersession.proposed);
    const old = await tx.hemoglobinTest.findUniqueOrThrow({ where: { id: supersession.recordId } });
    const child = await this.children.basics(old.childId);
    const derived = await this.derive(child, fields, old.altitudeMeters, supersession.now);
    const retired = await tx.hemoglobinTest.updateMany({ where: { id: old.id, isCurrent: true }, data: { isCurrent: false } });

    if (retired.count === 0) {
      throw DomainError.conflict('RECORD_NOT_CURRENT', 'Ese registro ya fue corregido. Recarga la ficha.');
    }

    const created = await tx.hemoglobinTest.create({
      data: {
        ...derived,
        childId: old.childId,
        facilityId: old.facilityId,
        recordedById: supersession.recordedById,
        recordedAt: supersession.now,
        version: old.version + 1,
        replacesId: old.id,
        correctionReason: supersession.reason,
      },
    });

    return created.id;
  }

  private async derive(child: ChildBasics, input: NewHemoglobinTest, altitudeMeters: number, now: Date): Promise<Derived> {
    const testedOn = validRecordDate('testedOn', input.testedOn, child.birthDate, now);
    const observed = Number(input.observed);

    if (observed < OBSERVED_MIN || observed > OBSERVED_MAX) {
      throw DomainError.validation({ observed: ['La hemoglobina debe estar entre 3,0 y 25,0 g/dL.'] });
    }

    const reference = await this.catalogs.anemiaReferenceInForce(testedOn);

    if (reference === null) {
      throw DomainError.unprocessable('THRESHOLDS_NOT_PUBLISHED', 'No hay umbrales de hemoglobina publicados para esa fecha. Pide al administrador que los publique.');
    }

    let adjusted: ReturnType<typeof adjustHemoglobin>;

    try {
      adjusted = adjustHemoglobin(observed, altitudeMeters, reference.adjustments);
    } catch {
      throw DomainError.unprocessable('ALTITUDE_TABLE_INCOMPLETE', `El catálogo vigente no tiene ajuste para ${altitudeMeters} m s. n. m.`);
    }

    const ageMonths = ageInCompletedMonths(child.birthDate, testedOn);

    return {
      testedOn: toDateColumn(testedOn),
      observed: new Prisma.Decimal(input.observed),
      altitudeMeters,
      adjustment: new Prisma.Decimal(adjusted.adjustment),
      adjusted: new Prisma.Decimal(adjusted.adjusted),
      ageMonths,
      classification: classifyAnemia(adjusted.adjusted, ageMonths, reference.thresholds),
      thresholdVersionId: reference.id,
    };
  }
}
