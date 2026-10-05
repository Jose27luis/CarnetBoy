import { HttpStatus, Injectable } from '@nestjs/common';
import { IRON_PRODUCTS, IRON_PURPOSES, type IronProduct, type IronPurpose, type IronSupplyRecord } from '@carnet/contracts';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { ClinicalRecordHandler, RecordSnapshot, Supersession } from '../../common/clinical/record-handler';
import { validRecordDate } from '../../common/clinical/record-date';
import { dateColumn, RECORD_META_INCLUDE, toRecordMeta } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { type ActorContext, type ChildBasics, ChildrenService } from '../children/children.service';

export interface NewIronSupply {
  suppliedOn: string;
  product: IronProduct;
  doseInstructions: string;
  quantity: number;
  purpose: IronPurpose;
}

type SupplyRow = Prisma.IronSupplyGetPayload<{ include: typeof RECORD_META_INCLUDE }>;

const referenceSchema = z.object({ id: z.uuid() });
const correctionSchema = z.object({
  suppliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  product: z.enum(IRON_PRODUCTS),
  doseInstructions: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
  purpose: z.enum(IRON_PURPOSES),
});

export function toIronRecord(row: SupplyRow, viewerId: string, now: Date): IronSupplyRecord {
  return {
    ...toRecordMeta(row, viewerId, now),
    suppliedOn: dateColumn(row.suppliedOn),
    product: row.product,
    doseInstructions: row.doseInstructions,
    quantity: row.quantity,
    purpose: row.purpose,
  };
}

@Injectable()
export class IronService implements ClinicalRecordHandler {
  readonly type = 'IRON_SUPPLY' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly children: ChildrenService,
  ) {}

  async list(viewerId: string, childId: string, now: Date): Promise<IronSupplyRecord[]> {
    const rows = await this.prisma.ironSupply.findMany({
      where: { childId, isCurrent: true },
      include: RECORD_META_INCLUDE,
      orderBy: [{ suppliedOn: 'desc' }, { recordedAt: 'desc' }],
    });

    return rows.map((row) => toIronRecord(row, viewerId, now));
  }

  async record(context: ActorContext, childId: string, input: NewIronSupply, idempotencyKey: string, now: Date = new Date()): Promise<IronSupplyRecord> {
    const child = await this.children.basics(childId);
    const data = this.fields(child, input, now);

    return this.idempotency.run(
      { accountId: context.actor.id, key: idempotencyKey, operation: 'iron_supply.record', body: { childId, ...input }, status: HttpStatus.CREATED },
      {
        reference: referenceSchema,
        effect: async (tx) => {
          const created = await tx.ironSupply.create({
            data: { ...data, childId, facilityId: context.facilityId, recordedById: context.actor.id, recordedAt: now },
          });
          await this.audit.record(tx, {
            actorId: context.actor.id,
            action: 'iron_supply.recorded',
            entity: 'child',
            entityId: childId,
            after: { ironSupplyId: created.id, ...input, facilityId: context.facilityId },
            ip: context.ip,
          });

          return { id: created.id };
        },
        present: async (reference) =>
          toIronRecord(await this.prisma.ironSupply.findUniqueOrThrow({ where: { id: reference.id }, include: RECORD_META_INCLUDE }), context.actor.id, now),
      },
      now,
    );
  }

  async snapshot(tx: Tx, recordId: string): Promise<RecordSnapshot | null> {
    const row = await tx.ironSupply.findUnique({ where: { id: recordId } });

    return row === null
      ? null
      : {
          childId: row.childId,
          recordedById: row.recordedById,
          recordedAt: row.recordedAt,
          isCurrent: row.isCurrent,
          data: {
            suppliedOn: dateColumn(row.suppliedOn),
            product: row.product,
            doseInstructions: row.doseInstructions,
            quantity: row.quantity,
            purpose: row.purpose,
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
    const old = await tx.ironSupply.findUniqueOrThrow({ where: { id: supersession.recordId } });
    const child = await this.children.basics(old.childId);
    const data = this.fields(child, fields, supersession.now);
    const retired = await tx.ironSupply.updateMany({ where: { id: old.id, isCurrent: true }, data: { isCurrent: false } });

    if (retired.count === 0) {
      throw DomainError.conflict('RECORD_NOT_CURRENT', 'Ese registro ya fue corregido. Recarga la ficha.');
    }

    const created = await tx.ironSupply.create({
      data: {
        ...data,
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

  private fields(child: ChildBasics, input: NewIronSupply, now: Date): Omit<Prisma.IronSupplyUncheckedCreateInput, 'childId' | 'facilityId' | 'recordedById'> {
    const suppliedOn = validRecordDate('suppliedOn', input.suppliedOn, child.birthDate, now);

    return {
      suppliedOn: toDateColumn(suppliedOn),
      product: input.product,
      doseInstructions: input.doseInstructions.trim(),
      quantity: input.quantity,
      purpose: input.purpose,
    };
  }
}
