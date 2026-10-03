export const DNI_PATTERN = /^\d{8}$/;
export const CNV_PATTERN = /^\d{8,12}$/;
export const ACTIVATION_CODE_LENGTH = 8;
export const ACTIVATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ACTIVATION_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
export const ACTIVATION_CODE_TTL_DAYS = 7;

export const SEXES = ['FEMALE', 'MALE'] as const;
export type Sex = (typeof SEXES)[number];

export const DELIVERY_TYPES = ['VAGINAL', 'CESAREAN'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const RELATIONSHIPS = ['MOTHER', 'FATHER', 'OTHER'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const LINK_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const CONSENT_VERSION = '2026-10';
export const CONSENT_TEXT = [
  'Autorizo que los datos de salud de la niña o el niño registrados en su establecimiento de EsSalud se muestren en Carnet CRED para que yo pueda consultarlos.',
  'Sé que solo yo y otros apoderados vinculados por el establecimiento podremos ver esta información, que no podré modificarla y que el acceso queda registrado.',
  'Puedo pedir en el establecimiento que se retire mi acceso cuando lo decida.',
] as const;

export interface PersonName {
  givenNames: string;
  paternalSurname: string;
  maternalSurname: string;
}

export interface BirthRecord {
  birthPlace: string | null;
  deliveryType: DeliveryType | null;
  weightGrams: number | null;
  lengthCm: string | null;
  headCircumferenceCm: string | null;
  apgar1: number | null;
  apgar5: number | null;
}

export interface ChildSummary extends PersonName {
  id: string;
  dni: string | null;
  cnv: string | null;
  sex: Sex;
  birthDate: string;
}

export interface Guardian extends PersonName {
  id: string;
  dni: string;
  phone: string | null;
  email: string | null;
  hasAccount: boolean;
}

export interface GuardianLink {
  id: string;
  status: LinkStatus;
  relationship: Relationship;
  guardian: Guardian;
  consentAt: string;
  createdAt: string;
  facilityName: string;
  pendingCodeExpiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  version: number;
}

export interface ChildRecord extends ChildSummary {
  gestationalWeeks: number | null;
  bloodType: BloodType | null;
  birth: BirthRecord | null;
  links: GuardianLink[];
  version: number;
}

export interface LinkCreated {
  link: GuardianLink;
  activationCode: string | null;
  codeExpiresAt: string | null;
}

export interface ActivationCodeIssued {
  activationCode: string;
  codeExpiresAt: string;
}

export interface DigitizerFacility {
  id: string;
  name: string;
  ipressCode: string;
}

export interface ActivationChallenge {
  challengeToken: string;
  challengeExpiresAt: string;
  guardian: PersonName;
  children: PersonName[];
}

export interface AdminLinkItem {
  id: string;
  status: LinkStatus;
  relationship: Relationship;
  child: ChildSummary;
  guardian: Guardian;
  facilityName: string;
  createdAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  version: number;
}

export interface GuardianChildName extends PersonName {
  id: string;
}
