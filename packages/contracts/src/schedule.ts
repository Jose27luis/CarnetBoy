import type { AppointmentType } from './catalogs';

export const APPOINTMENT_STATUSES = ['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const CLOSING_STATUSES = ['ATTENDED', 'MISSED', 'CANCELLED'] as const;
export type ClosingStatus = (typeof CLOSING_STATUSES)[number];

export const APPOINTMENT_ORIGINS = ['DIGITIZER', 'SYSTEM'] as const;
export type AppointmentOrigin = (typeof APPOINTMENT_ORIGINS)[number];

export const ATTENDANCE_WINDOW_DAYS = 7;

export interface Appointment {
  id: string;
  childId: string;
  childName: string;
  facilityName: string;
  type: AppointmentType;
  scheduledOn: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  note: string | null;
  cancelReason: string | null;
  createdByName: string;
  closedAt: string | null;
  version: number;
}

export interface AppointmentProposal {
  type: AppointmentType;
  suggestedOn: string;
  basis: string;
}

export interface ChildSchedule {
  upcoming: Appointment[];
  history: Appointment[];
  proposals: AppointmentProposal[];
  intervalsPublished: boolean;
}

export interface Agenda {
  date: string;
  appointments: Appointment[];
  overdue: Appointment[];
}
