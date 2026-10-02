export const CATALOG_KINDS = ['VACCINATION_SCHEDULE', 'HEMOGLOBIN_THRESHOLDS', 'APPOINTMENT_INTERVALS'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const CATALOG_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const APPOINTMENT_TYPES = ['GROWTH_CHECK', 'VACCINATION', 'HEMOGLOBIN_TEST'] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const MAX_AGE_DAYS = 11 * 366;
export const MAX_AGE_MONTHS = 11 * 12;

export interface Vaccine {
  id: string;
  code: string;
  name: string;
  prevents: string;
}

export interface CatalogVersion {
  id: string;
  kind: CatalogKind;
  norm: string;
  status: CatalogStatus;
  validFrom: string | null;
  validTo: string | null;
  publishedAt: string | null;
  entryCount: number;
  version: number;
}

export interface ScheduledDose {
  id: string;
  vaccine: Vaccine;
  doseNumber: number;
  recommendedAgeDays: number;
  maxAgeDays: number;
}

export interface HemoglobinThreshold {
  id: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  normalFrom: string;
  mildFrom: string;
  moderateFrom: string;
}

export interface AppointmentInterval {
  id: string;
  appointmentType: AppointmentType;
  minAgeMonths: number;
  maxAgeMonths: number;
  intervalDays: number;
}

export interface CatalogVersionDetail extends CatalogVersion {
  doses: ScheduledDose[];
  thresholds: HemoglobinThreshold[];
  intervals: AppointmentInterval[];
}
