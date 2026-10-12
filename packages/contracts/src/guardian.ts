import type { AppointmentType } from './catalogs';
import type { Sex } from './children';
import type { AnemiaClass, DoseStatus, IronProduct, IronPurpose, MeasurementPosition } from './clinical';

export interface GuardianChildCard {
  id: string;
  givenNames: string;
  paternalSurname: string;
  maternalSurname: string;
  sex: Sex;
  birthDate: string;
  dosesApplied: number;
  dosesDue: number;
  dosesOverdue: number;
  photoVersion: string | null;
}

export interface CarnetDose {
  scheduledDoseId: string;
  vaccineName: string;
  prevents: string;
  doseNumber: number;
  recommendedAgeDays: number;
  recommendedDate: string;
  maxAgeDays: number;
  status: DoseStatus;
  appliedOn: string | null;
  facilityName: string | null;
  lot: string | null;
}

export interface CarnetGrowthCheck {
  id: string;
  measuredOn: string;
  ageDays: number;
  correctedAgeDays: number;
  weightKg: string;
  lengthCm: string;
  position: MeasurementPosition;
  headCircumferenceCm: string | null;
  zWeightForAge: string | null;
  zLengthForAge: string | null;
  zWeightForLength: string | null;
  zHeadForAge: string | null;
  weightForAge: string | null;
  lengthForAge: string | null;
  weightForLength: string | null;
  headForAge: string | null;
  facilityName: string;
}

export interface CarnetHemoglobinTest {
  id: string;
  testedOn: string;
  ageMonths: number;
  observed: string;
  adjusted: string;
  altitudeMeters: number;
  classification: AnemiaClass;
  facilityName: string;
}

export interface CarnetIronSupply {
  id: string;
  suppliedOn: string;
  product: IronProduct;
  doseInstructions: string;
  quantity: number;
  purpose: IronPurpose;
  facilityName: string;
}

export interface CarnetAppointment {
  id: string;
  type: AppointmentType;
  scheduledOn: string;
  facilityName: string;
  note: string | null;
}

export type NextStep =
  | { kind: 'OVERDUE_VACCINES'; vaccines: string[] }
  | { kind: 'APPOINTMENT'; appointment: CarnetAppointment }
  | { kind: 'VACCINE'; vaccineName: string; doseNumber: number; recommendedDate: string }
  | { kind: 'NONE' };

export interface Achievement {
  key: string;
  title: string;
  description: string;
  achievedOn: string;
}

export interface GrowthBandPoint {
  x: number;
  values: [number, number, number, number, number];
}

export interface GrowthBands {
  weightForAge: GrowthBandPoint[];
  lengthForAge: GrowthBandPoint[];
  headForAge: GrowthBandPoint[];
}

export interface GuardianCarnet {
  child: GuardianChildCard & { gestationalWeeks: number | null };
  scheduleNorm: string | null;
  doses: CarnetDose[];
  growth: CarnetGrowthCheck[];
  growthBands: GrowthBands;
  hemoglobin: CarnetHemoglobinTest[];
  iron: CarnetIronSupply[];
  appointments: CarnetAppointment[];
  nextStep: NextStep;
  achievements: Achievement[];
}
