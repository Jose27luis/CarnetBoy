export const DOSE_STATUSES = ['FUTURE', 'DUE', 'OVERDUE', 'APPLIED'] as const;
export type DoseStatus = (typeof DOSE_STATUSES)[number];

export const MEASUREMENT_POSITIONS = ['LYING', 'STANDING'] as const;
export type MeasurementPosition = (typeof MEASUREMENT_POSITIONS)[number];

export const ANEMIA_CLASSES = ['NONE', 'MILD', 'MODERATE', 'SEVERE', 'UNCLASSIFIED'] as const;
export type AnemiaClass = (typeof ANEMIA_CLASSES)[number];

export const IRON_PRODUCTS = ['DROPS', 'SYRUP', 'MICRONUTRIENTS', 'TABLETS'] as const;
export type IronProduct = (typeof IRON_PRODUCTS)[number];

export const IRON_PURPOSES = ['PREVENTION', 'TREATMENT'] as const;
export type IronPurpose = (typeof IRON_PURPOSES)[number];

export const CLINICAL_RECORD_TYPES = ['DOSE', 'GROWTH_CHECK', 'HEMOGLOBIN_TEST', 'IRON_SUPPLY'] as const;
export type ClinicalRecordType = (typeof CLINICAL_RECORD_TYPES)[number];

export const CORRECTION_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED'] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const DIRECT_CORRECTION_WINDOW_HOURS = 72;
export const WEIGHT_CHANGE_CONFIRMATION_RATIO = 0.3;

export interface RecordMeta {
  id: string;
  recordedAt: string;
  recordedByName: string;
  facilityName: string;
  version: number;
  correctionReason: string | null;
  canCorrectDirectly: boolean;
}

export interface PendingCorrection {
  id: string;
  recordType: ClinicalRecordType;
  recordId: string;
  requestedAt: string;
}

export interface AdministeredDoseRecord extends RecordMeta {
  scheduledDoseId: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  administeredOn: string;
  lot: string;
  outOfRangeReason: string | null;
}

export interface ImmunizationDose {
  scheduledDoseId: string;
  vaccineId: string;
  vaccineCode: string;
  vaccineName: string;
  prevents: string;
  doseNumber: number;
  recommendedAgeDays: number;
  maxAgeDays: number;
  recommendedDate: string;
  status: DoseStatus;
  applied: AdministeredDoseRecord | null;
}

export interface ImmunizationStatus {
  schedule: { id: string; norm: string; validFrom: string } | null;
  doses: ImmunizationDose[];
  recentLots: Record<string, string[]>;
}

export interface GrowthCheckRecord extends RecordMeta {
  measuredOn: string;
  weightKg: string;
  lengthCm: string;
  position: MeasurementPosition;
  headCircumferenceCm: string | null;
  ageDays: number;
  correctedAgeDays: number;
  zWeightForAge: string | null;
  zLengthForAge: string | null;
  zWeightForLength: string | null;
  zHeadForAge: string | null;
  weightForAge: string | null;
  lengthForAge: string | null;
  weightForLength: string | null;
  headForAge: string | null;
  referenceVersion: string;
}

export interface HemoglobinTestRecord extends RecordMeta {
  testedOn: string;
  observed: string;
  altitudeMeters: number;
  adjustment: string;
  adjusted: string;
  ageMonths: number;
  classification: AnemiaClass;
  thresholdNorm: string;
}

export interface IronSupplyRecord extends RecordMeta {
  suppliedOn: string;
  product: IronProduct;
  doseInstructions: string;
  quantity: number;
  purpose: IronPurpose;
}

export interface AnemiaOverview {
  thresholdsPublished: boolean;
  facilityAltitude: number;
  tests: HemoglobinTestRecord[];
  supplies: IronSupplyRecord[];
}

export interface CorrectionOutcome {
  applied: boolean;
}

export interface CorrectionRequestItem {
  id: string;
  recordType: ClinicalRecordType;
  recordId: string;
  childId: string;
  childName: string;
  before: Record<string, unknown>;
  proposed: Record<string, unknown>;
  reason: string;
  requestedByName: string;
  requestedAt: string;
  status: CorrectionStatus;
  rejectionReason: string | null;
}
