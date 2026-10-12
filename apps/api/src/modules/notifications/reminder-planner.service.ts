import { Injectable, Logger } from '@nestjs/common';
import type { AppointmentType } from '@carnet/contracts';
import { todayInLima } from '../../common/clinical/record-meta';
import { AuditService } from '../audit/audit.service';
import { GuardianChildrenService } from '../children/guardian-children.service';
import { ImmunizationService } from '../immunization/immunization.service';
import { type DueReminder, ScheduleService } from '../schedule/schedule.service';
import { NotificationOutbox } from './notification-outbox.service';

export const SENDING_HOURS = { from: 7, to: 20 } as const;
export const OVERDUE_SCAN_HOUR = 9;
export const UPDATE_LOOKBACK_MS = 2 * 60 * 60 * 1000;
const SYSTEM_VIEWER = 'system';

export const CARNET_UPDATE_ACTIONS = [
  'dose.recorded',
  'growth_check.recorded',
  'hemoglobin_test.recorded',
  'iron_supply.recorded',
  'record.corrected',
  'correction.approved',
] as const;

const TYPE_TEXT: Record<AppointmentType, string> = {
  GROWTH_CHECK: 'control',
  VACCINATION: 'vacunación',
  HEMOGLOBIN_TEST: 'dosaje',
};

const LONG_DATE = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' });
const LIMA_HOUR = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Lima' });

export interface PlanSummary {
  reminders: number;
  overdue: number;
  updates: number;
  expiredLinks: number;
  queued: string[];
}

export function limaHour(now: Date): number {
  return Number(LIMA_HOUR.format(now));
}

export function reminderText(reminder: DueReminder): { title: string; body: string } {
  const { appointment } = reminder;
  const when = LONG_DATE.format(new Date(`${appointment.scheduledOn}T12:00:00Z`));
  const kind = TYPE_TEXT[appointment.type];

  return reminder.timing === 'SAME_DAY'
    ? { title: 'Hoy tienes una cita', body: `Hoy tienes una cita de ${kind} en ${appointment.facilityName}. Lleva el DNI del niño.` }
    : { title: 'Tienes una cita en 3 días', body: `Tienes una cita de ${kind} el ${when} en ${appointment.facilityName}.` };
}

@Injectable()
export class ReminderPlanner {
  private readonly logger = new Logger(ReminderPlanner.name);

  constructor(
    private readonly outbox: NotificationOutbox,
    private readonly schedule: ScheduleService,
    private readonly immunization: ImmunizationService,
    private readonly guardianChildren: GuardianChildrenService,
    private readonly audit: AuditService,
  ) {}

  async run(now: Date = new Date()): Promise<PlanSummary> {
    const expiredLinks = await this.guardianChildren.expirePendingLinks(now);
    const hour = limaHour(now);
    const summary: PlanSummary = { reminders: 0, overdue: 0, updates: 0, expiredLinks, queued: [] };

    if (hour < SENDING_HOURS.from || hour > SENDING_HOURS.to) {
      return summary;
    }

    await this.planReminders(now, summary);
    await this.planUpdates(now, summary);

    if (hour === OVERDUE_SCAN_HOUR) {
      await this.planOverdue(now, summary);
    }

    this.logger.log(`Avisos: ${summary.reminders} citas, ${summary.overdue} vacunas vencidas, ${summary.updates} novedades, ${expiredLinks} vínculos vencidos`);

    return summary;
  }

  private async planReminders(now: Date, summary: PlanSummary): Promise<void> {
    const today = todayInLima(now);

    for (const reminder of await this.schedule.remindersDue(today)) {
      const text = reminderText(reminder);

      for (const guardian of await this.guardianChildren.guardianAccountsOf(reminder.appointment.childId)) {
        summary.queued.push(
          ...(await this.outbox.enqueue({
            accountId: guardian.accountId,
            registeredEmail: guardian.email,
            childId: reminder.appointment.childId,
            kind: 'APPOINTMENT_REMINDER',
            key: `appointment:${reminder.appointment.id}:${reminder.timing}:${guardian.accountId}`,
            title: text.title,
            body: text.body,
            path: `/carnet/${reminder.appointment.childId}`,
          })),
        );
      }

      await this.schedule.markReminded(reminder.appointment.id, reminder.timing, now);
      summary.reminders += 1;
    }
  }

  private async planUpdates(now: Date, summary: PlanSummary): Promise<void> {
    const today = todayInLima(now);
    const children = await this.audit.entitiesWithActions('child', CARNET_UPDATE_ACTIONS, new Date(now.getTime() - UPDATE_LOOKBACK_MS));

    for (const childId of children) {
      for (const guardian of await this.guardianChildren.guardianAccountsOf(childId)) {
        const queued = await this.outbox.enqueue({
          accountId: guardian.accountId,
          registeredEmail: guardian.email,
          childId,
          kind: 'CARNET_UPDATED',
          key: `carnet:${childId}:${today}:${guardian.accountId}`,
          title: 'Hay novedades en el carnet',
          body: 'Se registró una nueva atención en el carnet de tu hijo. Entra para verla.',
          path: `/carnet/${childId}/historia`,
        });
        summary.queued.push(...queued);
        summary.updates += queued.length > 0 ? 1 : 0;
      }
    }
  }

  private async planOverdue(now: Date, summary: PlanSummary): Promise<void> {
    for (const childId of await this.guardianChildren.childrenWithActiveGuardians()) {
      const status = await this.immunization.status(SYSTEM_VIEWER, null, childId, now);
      const latest = status.doses
        .filter((dose) => dose.status === 'OVERDUE')
        .sort((first, second) => second.maxAgeDays - first.maxAgeDays)[0];

      if (latest === undefined) {
        continue;
      }

      for (const guardian of await this.guardianChildren.guardianAccountsOf(childId)) {
        const queued = await this.outbox.enqueue({
          accountId: guardian.accountId,
          registeredEmail: guardian.email,
          childId,
          kind: 'DOSE_OVERDUE',
          key: `overdue:${childId}:${latest.scheduledDoseId}:${guardian.accountId}`,
          title: 'Hay una vacuna pendiente',
          body: 'Revisa el carnet de tu hijo y acércate a tu establecimiento de salud.',
          path: `/carnet/${childId}/vacunas`,
        });
        summary.queued.push(...queued);
        summary.overdue += queued.length > 0 ? 1 : 0;
      }
    }
  }
}
