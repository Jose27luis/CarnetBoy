import { HttpStatus, Injectable } from '@nestjs/common';
import { type CalendarDate, parseCalendarDate } from '@carnet/clinical';
import type { BloodType, ChildRecord, ChildSummary, DeliveryType, Sex } from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { todayInLima } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';
import { isUniqueViolation } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { CHILD_RECORD_INCLUDE, toChildRecord, toChildSummary } from './children.mapper';
import { expireStaleLinks } from './stale-links';

export interface BirthInput {
  birthPlace?: string;
  deliveryType?: DeliveryType;
  weightGrams?: number;
  lengthCm?: string;
  headCircumferenceCm?: string;
  apgar1?: number;
  apgar5?: number;
}

export interface ChildIdentityInput {
  dni?: string;
  cnv?: string;
  givenNames: string;
  paternalSurname: string;
  maternalSurname: string;
  sex: Sex;
  birthDate: string;
  gestationalWeeks?: number;
  bloodType?: BloodType;
}

export interface NewChild extends ChildIdentityInput {
  birth?: BirthInput;
}

export interface ChildChanges extends ChildIdentityInput {
  birth?: BirthInput;
  expectedVersion: number;
}

export interface ChildBasics {
  id: string;
  fullName: string;
  sex: Sex;
  birthDate: CalendarDate;
  gestationalWeeks: number | null;
}

export interface ActorContext {
  actor: AuthenticatedUser;
  facilityId: string;
  ip: string;
}

const childReferenceSchema = z.object({ id: z.uuid() });

function documentTaken(): DomainError {
  return DomainError.conflict('CHILD_DOCUMENT_TAKEN', 'Ya hay un niño registrado con ese DNI o CNV. Búscalo para abrir su ficha.');
}

function birthData(birth: BirthInput): Omit<Prisma.BirthRecordUncheckedCreateInput, 'childId'> {
  return {
    birthPlace: birth.birthPlace?.trim() ?? null,
    deliveryType: birth.deliveryType ?? null,
    weightGrams: birth.weightGrams ?? null,
    lengthCm: birth.lengthCm === undefined ? null : new Prisma.Decimal(birth.lengthCm),
    headCircumferenceCm: birth.headCircumferenceCm === undefined ? null : new Prisma.Decimal(birth.headCircumferenceCm),
    apgar1: birth.apgar1 ?? null,
    apgar5: birth.apgar5 ?? null,
  };
}

function identityData(input: ChildIdentityInput): Omit<Prisma.ChildUncheckedCreateInput, 'createdById' | 'createdAtFacilityId'> {
  return {
    dni: input.dni ?? null,
    cnv: input.cnv ?? null,
    givenNames: input.givenNames.trim(),
    paternalSurname: input.paternalSurname.trim(),
    maternalSurname: input.maternalSurname.trim(),
    sex: input.sex,
    birthDate: toDateColumn(input.birthDate),
    gestationalWeeks: input.gestationalWeeks ?? null,
    bloodType: input.bloodType ?? null,
  };
}

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async search(document: string): Promise<ChildSummary | null> {
    const child = await this.prisma.child.findFirst({ where: { OR: [{ dni: document }, { cnv: document }] } });

    return child === null ? null : toChildSummary(child);
  }

  async register(context: ActorContext, input: NewChild, idempotencyKey: string, now: Date = new Date()): Promise<ChildRecord> {
    this.validateIdentity(input, now);

    try {
      return await this.idempotency.run(
        { accountId: context.actor.id, key: idempotencyKey, operation: 'child.register', body: input, status: HttpStatus.CREATED },
        {
          reference: childReferenceSchema,
          effect: async (tx) => {
            const child = await tx.child.create({
              data: { ...identityData(input), createdById: context.actor.id, createdAtFacilityId: context.facilityId },
            });

            if (input.birth !== undefined) {
              await tx.birthRecord.create({ data: { childId: child.id, ...birthData(input.birth) } });
            }

            await this.audit.record(tx, {
              actorId: context.actor.id,
              action: 'child.registered',
              entity: 'child',
              entityId: child.id,
              after: { ...toChildSummary(child), facilityId: context.facilityId, birth: input.birth ?? null },
              ip: context.ip,
            });

            return { id: child.id };
          },
          present: (reference) => this.load(this.prisma, reference.id),
        },
        now,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw documentTaken();
      }

      throw error;
    }
  }

  async view(context: ActorContext, childId: string, now: Date = new Date()): Promise<ChildRecord> {
    return this.prisma.$transaction(async (tx) => {
      await expireStaleLinks(tx, { childId }, now);
      const record = await this.load(tx, childId);
      await this.audit.record(tx, {
        actorId: context.actor.id,
        action: 'child.viewed',
        entity: 'child',
        entityId: childId,
        after: { facilityId: context.facilityId },
        ip: context.ip,
      });

      return record;
    });
  }

  async update(context: ActorContext, childId: string, changes: ChildChanges, now: Date = new Date()): Promise<ChildRecord> {
    this.validateIdentity(changes, now);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await this.load(tx, childId);
        const result = await tx.child.updateMany({
          where: { id: childId, version: changes.expectedVersion },
          data: { ...identityData(changes), version: { increment: 1 } },
        });

        if (result.count === 0) {
          throw DomainError.conflict('VERSION_CONFLICT', 'Otra persona modificó la ficha de este niño. Recarga y vuelve a intentarlo.');
        }

        if (changes.birth !== undefined) {
          const data = birthData(changes.birth);
          await tx.birthRecord.upsert({ where: { childId }, create: { childId, ...data }, update: data });
        }

        const after = await this.load(tx, childId);
        await this.audit.record(tx, {
          actorId: context.actor.id,
          action: 'child.updated',
          entity: 'child',
          entityId: childId,
          before: { ...before, links: undefined },
          after: { ...after, links: undefined, facilityId: context.facilityId },
          ip: context.ip,
        });

        return after;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw documentTaken();
      }

      throw error;
    }
  }

  async basics(childId: string): Promise<ChildBasics> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, givenNames: true, paternalSurname: true, maternalSurname: true, sex: true, birthDate: true, gestationalWeeks: true },
    });

    if (child === null) {
      throw DomainError.notFound('El niño no existe.');
    }

    return {
      id: child.id,
      fullName: `${child.givenNames} ${child.paternalSurname} ${child.maternalSurname}`,
      sex: child.sex,
      birthDate: parseCalendarDate(child.birthDate.toISOString().slice(0, 10)),
      gestationalWeeks: child.gestationalWeeks,
    };
  }

  async load(tx: Tx, childId: string): Promise<ChildRecord> {
    const row = await tx.child.findUnique({ where: { id: childId }, include: CHILD_RECORD_INCLUDE });

    if (row === null) {
      throw DomainError.notFound('El niño no existe.');
    }

    return toChildRecord(row);
  }

  private validateIdentity(input: ChildIdentityInput, now: Date): void {
    if (input.dni === undefined && input.cnv === undefined) {
      throw new DomainError(HttpStatus.BAD_REQUEST, 'CHILD_DOCUMENT_REQUIRED', 'Registra el DNI o el CNV del niño.', {
        dni: ['Ingresa el DNI o el CNV.'],
      });
    }

    let birthDate: string;

    try {
      birthDate = parseCalendarDate(input.birthDate);
    } catch {
      throw DomainError.validation({ birthDate: ['La fecha de nacimiento no existe en el calendario.'] });
    }

    if (birthDate > todayInLima(now)) {
      throw DomainError.validation({ birthDate: ['La fecha de nacimiento no puede ser futura.'] });
    }
  }
}
