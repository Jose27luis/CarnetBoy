import { addDays, type CalendarDate } from '@carnet/clinical';
import { ATTENDANCE_WINDOW_DAYS, type AppointmentType } from '@carnet/contracts';
import type { Tx } from '../../infrastructure/prisma/transaction';

export interface Attendance {
  childId: string;
  type: AppointmentType;
  attendedOn: CalendarDate;
  actorId: string;
  now: Date;
}

export async function markAppointmentAttended(tx: Tx, attendance: Attendance): Promise<void> {
  await tx.appointment.updateMany({
    where: {
      childId: attendance.childId,
      type: attendance.type,
      status: 'SCHEDULED',
      scheduledOn: { lte: new Date(`${addDays(attendance.attendedOn, ATTENDANCE_WINDOW_DAYS)}T00:00:00Z`) },
    },
    data: { status: 'ATTENDED', closedById: attendance.actorId, closedAt: attendance.now, version: { increment: 1 } },
  });
}
