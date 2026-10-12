import { HttpStatus, Injectable } from '@nestjs/common';
import { addDays, type CalendarDate, type IntervalRow, laterOf, parseCalendarDate, proposeAfter } from '@carnet/clinical';
import type { Agenda, Appointment, AppointmentOrigin, AppointmentProposal, AppointmentType, ChildSchedule, ClosingStatus } from '@carnet/contracts';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { dateColumn, todayInLima } from '../../common/clinical/record-meta';
import { DomainError } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { isUniqueViolation } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { toDateColumn } from '../catalogs/calendar-date-column';
import { CatalogVersionsService } from '../catalogs/catalog-versions.service';
import { type ActorContext, type ChildBasics, ChildrenService } from '../children/children.service';
import { ImmunizationService } from '../immunization/immunization.service';

export interface NewAppointment {
  type: AppointmentType;
  scheduledOn: string;
  origin: AppointmentOrigin;
  note?: string;
}

export interface Closing {
  status: ClosingStatus;
  reason?: string;
  expectedVersion: number;
}

const APPOINTMENT_INCLUDE = {
  child: { select: { givenNames: true, paternalSurname: true, maternalSurname: true } },
  facility: { select: { name: true } },
  createdBy: { select: { fullName: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_INCLUDE }>;

const referenceSchema = z.object({ id: z.uuid() });
const MAX_DAYS_AHEAD = 730;
const HISTORY_LIMIT = 20;
const OVERDUE_LIMIT = 100;

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    childId: row.childId,
    childName: `${row.child.givenNames} ${row.child.paternalSurname} ${row.child.maternalSurname}`,
    facilityName: row.facility.name,
    type: row.type,
    scheduledOn: dateColumn(row.scheduledOn),
    status: row.status,
    origin: row.origin,
    note: row.note,
    cancelReason: row.cancelReason,
    createdByName: row.createdBy.fullName,
    closedAt: row.closedAt?.toISOString() ?? null,
    version: row.version,
  };
}

function alreadyScheduled(): DomainError {
  return DomainError.conflict('APPOINTMENT_ALREADY_SCHEDULED', 'El niño ya tiene una cita programada de este tipo. Reprográmala o ciérrala primero.');
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly catalogs: CatalogVersionsService,
    private readonly children: ChildrenService,
    private readonly immunization: ImmunizationService,
  ) {}

  async forChild(viewerId: string, facilityId: string, childId: string, now: Date = new Date()): Promise<ChildSchedule> {
    const child = await this.children.basics(childId);
    const today = todayInLima(now);
    const rows = await this.prisma.appointment.findMany({
      where: { childId },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ scheduledOn: 'desc' }, { createdAt: 'desc' }],
    });
    const upcoming = rows.filter((row) => row.status === 'SCHEDULED').reverse();
    const scheduledTypes = new Set(upcoming.map((row) => row.type));
    const intervals = await this.catalogs.intervalsInForce(today);
    const proposals = await this.proposals(viewerId, facilityId, child, intervals ?? [], scheduledTypes, today, now);

    return {
      upcoming: upcoming.map(toAppointment),
      history: rows.filter((row) => row.status !== 'SCHEDULED').slice(0, HISTORY_LIMIT).map(toAppointment),
      proposals,
      intervalsPublished: intervals !== null,
    };
  }

  async upcoming(childId: string): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { childId, status: 'SCHEDULED' },
      include: APPOINTMENT_INCLUDE,
      orderBy: { scheduledOn: 'asc' },
    });

    return rows.map(toAppointment);
  }

  async schedule(context: ActorContext, childId: string, input: NewAppointment, idempotencyKey: string, now: Date = new Date()): Promise<Appointment> {
    await this.children.basics(childId);
    const scheduledOn = this.validDate(input.scheduledOn, now);

    try {
      return await this.idempotency.run(
        { accountId: context.actor.id, key: idempotencyKey, operation: 'appointment.schedule', body: { childId, ...input }, status: HttpStatus.CREATED },
        {
          reference: referenceSchema,
          effect: async (tx) => {
            const created = await tx.appointment.create({
              data: {
                childId,
                facilityId: context.facilityId,
                type: input.type,
                scheduledOn: toDateColumn(scheduledOn),
                origin: input.origin,
                note: input.note?.trim() || null,
                createdById: context.actor.id,
                createdAt: now,
              },
            });
            await this.audit.record(tx, {
              actorId: context.actor.id,
              action: 'appointment.scheduled',
              entity: 'child',
              entityId: childId,
              after: { appointmentId: created.id, type: input.type, scheduledOn, facilityId: context.facilityId, origin: input.origin },
              ip: context.ip,
            });

            return { id: created.id };
          },
          present: async (reference) => toAppointment(await this.prisma.appointment.findUniqueOrThrow({ where: { id: reference.id }, include: APPOINTMENT_INCLUDE })),
        },
        now,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw alreadyScheduled();
      }

      throw error;
    }
  }

  async reschedule(context: ActorContext, appointmentId: string, scheduledOnInput: string, expectedVersion: number, now: Date = new Date()): Promise<Appointment> {
    const scheduledOn = this.validDate(scheduledOnInput, now);

    return this.change(context, appointmentId, expectedVersion, 'appointment.rescheduled', (row) => ({
      data: { scheduledOn: toDateColumn(scheduledOn), facilityId: context.facilityId },
      before: { scheduledOn: dateColumn(row.scheduledOn) },
      after: { scheduledOn, facilityId: context.facilityId },
    }));
  }

  async close(context: ActorContext, appointmentId: string, closing: Closing, now: Date = new Date()): Promise<Appointment> {
    const reason = closing.reason?.trim();

    if (closing.status === 'CANCELLED' && (reason === undefined || reason.length === 0)) {
      throw DomainError.validation({ reason: ['Indica por qué se cancela la cita.'] });
    }

    return this.change(context, appointmentId, closing.expectedVersion, 'appointment.closed', () => ({
      data: {
        status: closing.status,
        closedById: context.actor.id,
        closedAt: now,
        cancelReason: closing.status === 'CANCELLED' ? (reason ?? null) : null,
      },
      before: { status: 'SCHEDULED' },
      after: { status: closing.status, reason: reason ?? null },
    }));
  }

  async agenda(facilityId: string, dateInput: string | undefined, now: Date = new Date()): Promise<Agenda> {
    const today = todayInLima(now);
    let date: CalendarDate = today;

    if (dateInput !== undefined) {
      try {
        date = parseCalendarDate(dateInput);
      } catch {
        throw DomainError.validation({ date: ['La fecha no existe en el calendario.'] });
      }
    }

    const [appointments, overdue] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { facilityId, scheduledOn: toDateColumn(date) },
        include: APPOINTMENT_INCLUDE,
        orderBy: [{ status: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.appointment.findMany({
        where: { facilityId, status: 'SCHEDULED', scheduledOn: { lt: toDateColumn(today) } },
        include: APPOINTMENT_INCLUDE,
        orderBy: { scheduledOn: 'asc' },
        take: OVERDUE_LIMIT,
      }),
    ]);

    return { date, appointments: appointments.map(toAppointment), overdue: overdue.map(toAppointment) };
  }

  private async change(
    context: ActorContext,
    appointmentId: string,
    expectedVersion: number,
    action: string,
    decide: (row: AppointmentRow) => { data: Prisma.AppointmentUncheckedUpdateInput; before: Record<string, unknown>; after: Record<string, unknown> },
  ): Promise<Appointment> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM appointments WHERE id = ${appointmentId}::uuid FOR UPDATE`;
      const row = await tx.appointment.findUnique({ where: { id: appointmentId }, include: APPOINTMENT_INCLUDE });

      if (row === null) {
        throw DomainError.notFound('La cita no existe.');
      }

      if (row.status !== 'SCHEDULED') {
        throw DomainError.conflict('APPOINTMENT_NOT_SCHEDULED', 'La cita ya fue cerrada.');
      }

      if (row.version !== expectedVersion) {
        throw DomainError.conflict('VERSION_CONFLICT', 'Otra persona modificó esta cita. Recarga y vuelve a intentarlo.');
      }

      const change = decide(row);
      await tx.appointment.update({ where: { id: row.id }, data: { ...change.data, version: { increment: 1 } } });
      await this.audit.record(tx, {
        actorId: context.actor.id,
        action,
        entity: 'child',
        entityId: row.childId,
        before: { appointmentId: row.id, ...change.before },
        after: { appointmentId: row.id, ...change.after },
        ip: context.ip,
      });
    });

    return toAppointment(await this.prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: APPOINTMENT_INCLUDE }));
  }

  private validDate(value: string, now: Date): CalendarDate {
    let date: CalendarDate;

    try {
      date = parseCalendarDate(value);
    } catch {
      throw DomainError.validation({ scheduledOn: ['La fecha no existe en el calendario.'] });
    }

    const today = todayInLima(now);

    if (date < today) {
      throw DomainError.validation({ scheduledOn: ['La cita no puede quedar en una fecha pasada.'] });
    }

    if (date > addDays(today, MAX_DAYS_AHEAD)) {
      throw DomainError.validation({ scheduledOn: ['La cita no puede quedar a más de dos años.'] });
    }

    return date;
  }

  private async proposals(
    viewerId: string,
    facilityId: string,
    child: ChildBasics,
    intervals: readonly IntervalRow[],
    scheduledTypes: ReadonlySet<AppointmentType>,
    today: CalendarDate,
    now: Date,
  ): Promise<AppointmentProposal[]> {
    const proposals: AppointmentProposal[] = [];

    if (!scheduledTypes.has('GROWTH_CHECK')) {
      const last = await this.prisma.growthCheck.findFirst({ where: { childId: child.id, isCurrent: true }, orderBy: { measuredOn: 'desc' }, select: { measuredOn: true } });
      const lastOn = last === null ? null : parseCalendarDate(dateColumn(last.measuredOn));
      const proposed = proposeAfter(child.birthDate, lastOn, 'GROWTH_CHECK', intervals, today);

      if (proposed !== null) {
        proposals.push({
          type: 'GROWTH_CHECK',
          suggestedOn: proposed.suggestedOn,
          basis: lastOn === null ? `${proposed.intervalDays} días después del nacimiento` : `${proposed.intervalDays} días después del último control`,
        });
      }
    }

    if (!scheduledTypes.has('HEMOGLOBIN_TEST')) {
      const last = await this.prisma.hemoglobinTest.findFirst({ where: { childId: child.id, isCurrent: true }, orderBy: { testedOn: 'desc' }, select: { testedOn: true } });
      const lastOn = last === null ? null : parseCalendarDate(dateColumn(last.testedOn));
      const proposed = proposeAfter(child.birthDate, lastOn, 'HEMOGLOBIN_TEST', intervals, today);

      if (proposed !== null) {
        proposals.push({
          type: 'HEMOGLOBIN_TEST',
          suggestedOn: proposed.suggestedOn,
          basis: lastOn === null ? `${proposed.intervalDays} días después del nacimiento` : `${proposed.intervalDays} días después del último dosaje`,
        });
      }
    }

    if (!scheduledTypes.has('VACCINATION')) {
      const status = await this.immunization.status(viewerId, facilityId, child.id, now);
      const next = status.doses
        .filter((dose) => dose.status !== 'APPLIED')
        .sort((first, second) => first.recommendedDate.localeCompare(second.recommendedDate))[0];

      if (next !== undefined) {
        proposals.push({
          type: 'VACCINATION',
          suggestedOn: laterOf(parseCalendarDate(next.recommendedDate), today),
          basis: `${next.vaccineName}, dosis ${next.doseNumber}${next.status === 'OVERDUE' ? ' (vencida)' : ''}`,
        });
      }
    }

    return proposals.sort((first, second) => first.suggestedOn.localeCompare(second.suggestedOn));
  }
}
