import { HttpStatus, Injectable } from '@nestjs/common';
import { assessGrowth, correctedAgeDays, daysBetween, parseCalendarDate, WHO_REFERENCE_VERSION } from '@carnet/clinical';
import { WEIGHT_CHANGE_CONFIRMATION_RATIO, type GrowthCheckRecord, type MeasurementPosition } from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { markAppointmentAttended } from '../../common/clinical/appointment-attendance';
import type { ClinicalRecordHandler, RecordSnapshot, Supersession } from '../../common/clinical/record-handler';
import { validRecordDate } from '../../common/clinical/record-date';
import { dateColumn, RECORD_META_INCLUDE, toRecordMeta } from '../../common/clinical/record-meta';
import { DomainError, type FieldErrors } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { type ActorContext, type ChildBasics, ChildrenService } from '../children/children.service';

export interface NewGrowthCheck {
  measuredOn: string;
  weightKg: string;
  lengthCm: string;
  position: MeasurementPosition;
  headCircumferenceCm?: string;
  confirmed?: boolean;
}

type GrowthRow = Prisma.GrowthCheckGetPayload<{ include: typeof RECORD_META_INCLUDE }>;

const referenceSchema = z.object({ id: z.uuid() });
const correctionSchema = z.object({
  measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.string().regex(/^\d{1,2}(\.\d{1,3})?$/),
  lengthCm: z.string().regex(/^\d{2,3}(\.\d)?$/),
  position: z.enum(['LYING', 'STANDING']),
  headCircumferenceCm: z.string().regex(/^\d{2}(\.\d)?$/).optional(),
  confirmed: z.boolean().optional(),
});

const LIMITS = {
  weightKg: { min: 0.3, max: 40, label: 'El peso debe estar entre 0,3 y 40 kg.' },
  lengthCm: { min: 30, max: 130, label: 'La talla debe estar entre 30 y 130 cm.' },
  headCircumferenceCm: { min: 18, max: 60, label: 'El perímetro cefálico debe estar entre 18 y 60 cm.' },
} as const;

type Derived = Omit<Prisma.GrowthCheckUncheckedCreateInput, 'childId' | 'facilityId' | 'recordedById'>;

function decimalOrNull(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value);
}

function text(value: Prisma.Decimal | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}

export function toGrowthRecord(row: GrowthRow, viewerId: string, now: Date): GrowthCheckRecord {
  return {
    ...toRecordMeta(row, viewerId, now),
    measuredOn: dateColumn(row.measuredOn),
    weightKg: row.weightKg.toFixed(3),
    lengthCm: row.lengthCm.toFixed(1),
    position: row.position,
    headCircumferenceCm: text(row.headCircumferenceCm, 1),
    ageDays: row.ageDays,
    correctedAgeDays: row.correctedAgeDays,
    zWeightForAge: text(row.zWeightForAge, 2),
    zLengthForAge: text(row.zLengthForAge, 2),
    zWeightForLength: text(row.zWeightForLength, 2),
    zHeadForAge: text(row.zHeadForAge, 2),
    weightForAge: row.weightForAge,
    lengthForAge: row.lengthForAge,
    weightForLength: row.weightForLength,
    headForAge: row.headForAge,
    referenceVersion: row.referenceVersion,
  };
}

@Injectable()
export class GrowthService implements ClinicalRecordHandler {
  readonly type = 'GROWTH_CHECK' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly children: ChildrenService,
  ) {}

  async list(viewerId: string, childId: string, now: Date = new Date()): Promise<GrowthCheckRecord[]> {
    await this.children.basics(childId);
    const rows = await this.prisma.growthCheck.findMany({
      where: { childId, isCurrent: true },
      include: RECORD_META_INCLUDE,
      orderBy: [{ measuredOn: 'desc' }, { recordedAt: 'desc' }],
    });

    return rows.map((row) => toGrowthRecord(row, viewerId, now));
  }

  async record(context: ActorContext, childId: string, input: NewGrowthCheck, idempotencyKey: string, now: Date = new Date()): Promise<GrowthCheckRecord> {
    const child = await this.children.basics(childId);
    const derived = await this.derive(this.prisma, child, input, null, now);

    return this.idempotency.run(
      { accountId: context.actor.id, key: idempotencyKey, operation: 'growth_check.record', body: { childId, ...input }, status: HttpStatus.CREATED },
      {
        reference: referenceSchema,
        effect: async (tx) => {
          const created = await tx.growthCheck.create({
            data: { ...derived, childId, facilityId: context.facilityId, recordedById: context.actor.id, recordedAt: now },
          });
          await markAppointmentAttended(tx, { childId, type: 'GROWTH_CHECK', attendedOn: parseCalendarDate(input.measuredOn), actorId: context.actor.id, now });
          await this.audit.record(tx, {
            actorId: context.actor.id,
            action: 'growth_check.recorded',
            entity: 'child',
            entityId: childId,
            after: { growthCheckId: created.id, measuredOn: input.measuredOn, weightKg: input.weightKg, lengthCm: input.lengthCm, facilityId: context.facilityId },
            ip: context.ip,
          });

          return { id: created.id };
        },
        present: async (reference) =>
          toGrowthRecord(await this.prisma.growthCheck.findUniqueOrThrow({ where: { id: reference.id }, include: RECORD_META_INCLUDE }), context.actor.id, now),
      },
      now,
    );
  }

  async snapshot(tx: Tx, recordId: string): Promise<RecordSnapshot | null> {
    const row = await tx.growthCheck.findUnique({ where: { id: recordId } });

    return row === null
      ? null
      : {
          childId: row.childId,
          recordedById: row.recordedById,
          recordedAt: row.recordedAt,
          isCurrent: row.isCurrent,
          data: {
            measuredOn: dateColumn(row.measuredOn),
            weightKg: row.weightKg.toFixed(3),
            lengthCm: row.lengthCm.toFixed(1),
            position: row.position,
            headCircumferenceCm: text(row.headCircumferenceCm, 1),
          },
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
    const old = await tx.growthCheck.findUniqueOrThrow({ where: { id: supersession.recordId } });
    const child = await this.children.basics(old.childId);
    const derived = await this.derive(tx, child, { ...fields, confirmed: true }, old.id, supersession.now);
    const retired = await tx.growthCheck.updateMany({ where: { id: old.id, isCurrent: true }, data: { isCurrent: false } });

    if (retired.count === 0) {
      throw DomainError.conflict('RECORD_NOT_CURRENT', 'Ese registro ya fue corregido. Recarga la ficha.');
    }

    const created = await tx.growthCheck.create({
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

  private async derive(db: Tx | PrismaService, child: ChildBasics, input: NewGrowthCheck, excludeId: string | null, now: Date): Promise<Derived> {
    const measuredOn = validRecordDate('measuredOn', input.measuredOn, child.birthDate, now);
    const weightKg = Number(input.weightKg);
    const lengthCm = Number(input.lengthCm);
    const headCircumferenceCm = input.headCircumferenceCm === undefined ? null : Number(input.headCircumferenceCm);
    const errors: FieldErrors = {};

    if (weightKg < LIMITS.weightKg.min || weightKg > LIMITS.weightKg.max) {
      errors.weightKg = [LIMITS.weightKg.label];
    }

    if (lengthCm < LIMITS.lengthCm.min || lengthCm > LIMITS.lengthCm.max) {
      errors.lengthCm = [LIMITS.lengthCm.label];
    }

    if (headCircumferenceCm !== null && (headCircumferenceCm < LIMITS.headCircumferenceCm.min || headCircumferenceCm > LIMITS.headCircumferenceCm.max)) {
      errors.headCircumferenceCm = [LIMITS.headCircumferenceCm.label];
    }

    if (Object.keys(errors).length > 0) {
      throw DomainError.validation(errors);
    }

    if (input.confirmed !== true) {
      await this.ensurePlausibleChange(db, child.id, measuredOn, weightKg, excludeId);
    }

    const ageDays = daysBetween(child.birthDate, measuredOn);
    const corrected = correctedAgeDays(child.birthDate, child.gestationalWeeks, measuredOn);
    const assessment = assessGrowth({ sex: child.sex, ageDays: corrected, weightKg, lengthCm, position: input.position, headCircumferenceCm });

    return {
      measuredOn: toDateColumn(measuredOn),
      weightKg: new Prisma.Decimal(input.weightKg),
      lengthCm: new Prisma.Decimal(input.lengthCm),
      position: input.position,
      headCircumferenceCm: input.headCircumferenceCm === undefined ? null : new Prisma.Decimal(input.headCircumferenceCm),
      ageDays,
      correctedAgeDays: corrected,
      zWeightForAge: decimalOrNull(assessment.zWeightForAge),
      zLengthForAge: decimalOrNull(assessment.zLengthForAge),
      zWeightForLength: decimalOrNull(assessment.zWeightForLength),
      zHeadForAge: decimalOrNull(assessment.zHeadForAge),
      weightForAge: assessment.weightForAge,
      lengthForAge: assessment.lengthForAge,
      weightForLength: assessment.weightForLength,
      headForAge: assessment.headForAge,
      referenceVersion: WHO_REFERENCE_VERSION,
    };
  }

  private async ensurePlausibleChange(db: Tx | PrismaService, childId: string, measuredOn: string, weightKg: number, excludeId: string | null): Promise<void> {
    const previous = await db.growthCheck.findFirst({
      where: { childId, isCurrent: true, measuredOn: { lte: toDateColumn(measuredOn) }, ...(excludeId === null ? {} : { id: { not: excludeId } }) },
      orderBy: [{ measuredOn: 'desc' }, { recordedAt: 'desc' }],
      select: { weightKg: true, measuredOn: true },
    });

    if (previous === null) {
      return;
    }

    const before = previous.weightKg.toNumber();

    if (Math.abs(weightKg - before) / before > WEIGHT_CHANGE_CONFIRMATION_RATIO) {
      throw DomainError.unprocessable(
        'MEASUREMENT_NEEDS_CONFIRMATION',
        `El peso cambia más del 30 % respecto del control del ${dateColumn(previous.measuredOn)} (${previous.weightKg.toFixed(3)} kg). Revisa la medida y confírmala.`,
      );
    }
  }
}
