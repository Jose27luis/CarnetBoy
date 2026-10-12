import { HttpStatus, Injectable } from '@nestjs/common';
import { daysBetween, doseStatus, dateAtAge, isWithinDoseAge } from '@carnet/clinical';
import type { AdministeredDoseRecord, ImmunizationStatus } from '@carnet/contracts';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { markAppointmentAttended } from '../../common/clinical/appointment-attendance';
import type { ClinicalRecordHandler, RecordSnapshot, Supersession } from '../../common/clinical/record-handler';
import { validRecordDate } from '../../common/clinical/record-date';
import { dateColumn, RECORD_META_INCLUDE, todayInLima, toRecordMeta } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { isUniqueViolation } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { CatalogVersionsService, type ScheduleDoseInForce } from '../catalogs/catalog-versions.service';
import { type ActorContext, ChildrenService } from '../children/children.service';

export interface NewDose {
  scheduledDoseId: string;
  administeredOn: string;
  lot: string;
  outOfRangeReason?: string;
}

const DOSE_INCLUDE = { ...RECORD_META_INCLUDE, vaccine: { select: { name: true } } } satisfies Prisma.AdministeredDoseInclude;
type DoseRow = Prisma.AdministeredDoseGetPayload<{ include: typeof DOSE_INCLUDE }>;

const referenceSchema = z.object({ id: z.uuid() });
const correctionSchema = z.object({
  administeredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lot: z.string().trim().min(1).max(40),
  outOfRangeReason: z.string().trim().min(3).max(300).optional(),
});
const RECENT_LOTS = 3;

function alreadyRecorded(): DomainError {
  return DomainError.conflict('DOSE_ALREADY_RECORDED', 'Esa dosis ya está registrada para este niño. Si hay un error, corrígela.');
}

export function toDoseRecord(row: DoseRow, viewerId: string, now: Date): AdministeredDoseRecord {
  return {
    ...toRecordMeta(row, viewerId, now),
    scheduledDoseId: row.scheduledDoseId,
    vaccineId: row.vaccineId,
    vaccineName: row.vaccine.name,
    doseNumber: row.doseNumber,
    administeredOn: dateColumn(row.administeredOn),
    lot: row.lot,
    outOfRangeReason: row.outOfRangeReason,
  };
}

@Injectable()
export class ImmunizationService implements ClinicalRecordHandler {
  readonly type = 'DOSE' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly catalogs: CatalogVersionsService,
    private readonly children: ChildrenService,
  ) {}

  async status(viewerId: string, facilityId: string | null, childId: string, now: Date = new Date()): Promise<ImmunizationStatus> {
    const child = await this.children.basics(childId);
    const schedule = await this.catalogs.scheduleInForce(child.birthDate);

    if (schedule === null) {
      return { schedule: null, doses: [], recentLots: {} };
    }

    const applied = await this.prisma.administeredDose.findMany({ where: { childId, isCurrent: true }, include: DOSE_INCLUDE });
    const today = todayInLima(now);
    const byDose = new Map(applied.map((row) => [`${row.vaccineId}:${row.doseNumber}`, row]));

    return {
      schedule: { id: schedule.id, norm: schedule.norm, validFrom: schedule.validFrom },
      doses: schedule.doses.map((dose) => {
        const row = byDose.get(`${dose.vaccineId}:${dose.doseNumber}`);

        return {
          scheduledDoseId: dose.id,
          vaccineId: dose.vaccineId,
          vaccineCode: dose.vaccineCode,
          vaccineName: dose.vaccineName,
          prevents: dose.prevents,
          doseNumber: dose.doseNumber,
          recommendedAgeDays: dose.recommendedAgeDays,
          maxAgeDays: dose.maxAgeDays,
          recommendedDate: dateAtAge(child.birthDate, dose.recommendedAgeDays),
          status: doseStatus(dose, child.birthDate, row !== undefined, today),
          applied: row === undefined ? null : toDoseRecord(row, viewerId, now),
        };
      }),
      recentLots: facilityId === null ? {} : await this.recentLots(facilityId, schedule.doses),
    };
  }

  async record(context: ActorContext, childId: string, input: NewDose, idempotencyKey: string, now: Date = new Date()): Promise<AdministeredDoseRecord> {
    const child = await this.children.basics(childId);
    const schedule = await this.catalogs.scheduleInForce(child.birthDate);

    if (schedule === null) {
      throw DomainError.unprocessable('SCHEDULE_NOT_PUBLISHED', 'No hay un esquema de vacunación publicado. Pide al administrador que lo publique.');
    }

    const dose = schedule.doses.find((candidate) => candidate.id === input.scheduledDoseId);

    if (dose === undefined) {
      throw DomainError.validation({ scheduledDoseId: ['Esa dosis no pertenece al esquema que corresponde a este niño.'] });
    }

    const administeredOn = validRecordDate('administeredOn', input.administeredOn, child.birthDate, now);
    const ageDays = daysBetween(child.birthDate, administeredOn);
    const outOfRangeReason = input.outOfRangeReason?.trim();

    if (!isWithinDoseAge(dose, ageDays) && (outOfRangeReason === undefined || outOfRangeReason.length === 0)) {
      throw new DomainError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'DOSE_OUT_OF_RANGE',
        `A los ${ageDays} días de edad esta dosis está fuera del rango recomendado (${dose.recommendedAgeDays} a ${dose.maxAgeDays} días). Indica el motivo para registrarla.`,
      );
    }

    try {
      return await this.idempotency.run(
        { accountId: context.actor.id, key: idempotencyKey, operation: 'dose.record', body: { childId, ...input }, status: HttpStatus.CREATED },
        {
          reference: referenceSchema,
          effect: async (tx) => {
            const created = await tx.administeredDose.create({
              data: {
                childId,
                scheduledDoseId: dose.id,
                vaccineId: dose.vaccineId,
                doseNumber: dose.doseNumber,
                administeredOn: toDateColumn(administeredOn),
                lot: input.lot.trim().toUpperCase(),
                outOfRangeReason: isWithinDoseAge(dose, ageDays) ? null : (outOfRangeReason ?? null),
                facilityId: context.facilityId,
                recordedById: context.actor.id,
                recordedAt: now,
              },
            });
            await markAppointmentAttended(tx, { childId, type: 'VACCINATION', attendedOn: administeredOn, actorId: context.actor.id, now });
            await this.audit.record(tx, {
              actorId: context.actor.id,
              action: 'dose.recorded',
              entity: 'child',
              entityId: childId,
              after: { doseId: created.id, vaccine: dose.vaccineCode, doseNumber: dose.doseNumber, administeredOn, facilityId: context.facilityId },
              ip: context.ip,
            });

            return { id: created.id };
          },
          present: async (reference) => toDoseRecord(await this.prisma.administeredDose.findUniqueOrThrow({ where: { id: reference.id }, include: DOSE_INCLUDE }), context.actor.id, now),
        },
        now,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw alreadyRecorded();
      }

      throw error;
    }
  }

  async snapshot(tx: Tx, recordId: string): Promise<RecordSnapshot | null> {
    const row = await tx.administeredDose.findUnique({ where: { id: recordId }, include: { vaccine: { select: { name: true } } } });

    return row === null
      ? null
      : {
          childId: row.childId,
          recordedById: row.recordedById,
          recordedAt: row.recordedAt,
          isCurrent: row.isCurrent,
          data: {
            vaccine: `${row.vaccine.name}, dosis ${row.doseNumber}`,
            administeredOn: dateColumn(row.administeredOn),
            lot: row.lot,
            outOfRangeReason: row.outOfRangeReason,
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
    const old = await tx.administeredDose.findUniqueOrThrow({ where: { id: supersession.recordId } });
    const child = await this.children.basics(old.childId);
    const dose = await tx.scheduledDose.findUniqueOrThrow({ where: { id: old.scheduledDoseId } });
    const administeredOn = validRecordDate('administeredOn', fields.administeredOn, child.birthDate, supersession.now);
    const ageDays = daysBetween(child.birthDate, administeredOn);
    const withinRange = isWithinDoseAge(dose, ageDays);

    if (!withinRange && fields.outOfRangeReason === undefined) {
      throw DomainError.unprocessable('DOSE_OUT_OF_RANGE', 'La fecha corregida queda fuera del rango de la dosis. Indica el motivo.');
    }

    const retired = await tx.administeredDose.updateMany({ where: { id: old.id, isCurrent: true }, data: { isCurrent: false } });

    if (retired.count === 0) {
      throw DomainError.conflict('RECORD_NOT_CURRENT', 'Ese registro ya fue corregido. Recarga la ficha.');
    }

    const created = await tx.administeredDose.create({
      data: {
        childId: old.childId,
        scheduledDoseId: old.scheduledDoseId,
        vaccineId: old.vaccineId,
        doseNumber: old.doseNumber,
        administeredOn: toDateColumn(administeredOn),
        lot: fields.lot.toUpperCase(),
        outOfRangeReason: withinRange ? null : (fields.outOfRangeReason ?? null),
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

  private async recentLots(facilityId: string, doses: readonly ScheduleDoseInForce[]): Promise<Record<string, string[]>> {
    const vaccineIds = [...new Set(doses.map((dose) => dose.vaccineId))];
    const rows = await this.prisma.administeredDose.findMany({
      where: { facilityId, vaccineId: { in: vaccineIds } },
      select: { vaccineId: true, lot: true },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
    const lots: Record<string, string[]> = {};

    for (const row of rows) {
      const list = lots[row.vaccineId] ?? [];

      if (!list.includes(row.lot) && list.length < RECENT_LOTS) {
        list.push(row.lot);
      }

      lots[row.vaccineId] = list;
    }

    return lots;
  }
}
