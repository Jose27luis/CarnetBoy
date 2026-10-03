import type { BloodType, ChildRecord, ChildSummary, Guardian, GuardianLink } from '@carnet/contracts';
import { BLOOD_TYPES } from '@carnet/contracts';
import type { Prisma } from '@prisma/client';
import { fromDateColumn } from '../catalogs/calendar-date-column';

export const LINK_INCLUDE = {
  guardian: true,
  facility: { select: { name: true } },
  activationCodes: { where: { usedAt: null, revokedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.GuardianLinkInclude;

export const CHILD_RECORD_INCLUDE = {
  birthRecord: true,
  links: { include: LINK_INCLUDE, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ChildInclude;

type ChildRow = Prisma.ChildGetPayload<Record<string, never>>;
type GuardianRow = Prisma.GuardianGetPayload<Record<string, never>>;
type LinkRow = Prisma.GuardianLinkGetPayload<{ include: typeof LINK_INCLUDE }>;
type ChildRecordRow = Prisma.ChildGetPayload<{ include: typeof CHILD_RECORD_INCLUDE }>;

function toBloodType(value: string | null): BloodType | null {
  return BLOOD_TYPES.find((bloodType) => bloodType === value) ?? null;
}

export function toChildSummary(row: ChildRow): ChildSummary {
  return {
    id: row.id,
    dni: row.dni,
    cnv: row.cnv,
    givenNames: row.givenNames,
    paternalSurname: row.paternalSurname,
    maternalSurname: row.maternalSurname,
    sex: row.sex,
    birthDate: fromDateColumn(row.birthDate) ?? '',
  };
}

export function toGuardian(row: GuardianRow): Guardian {
  return {
    id: row.id,
    dni: row.dni,
    givenNames: row.givenNames,
    paternalSurname: row.paternalSurname,
    maternalSurname: row.maternalSurname,
    phone: row.phone,
    email: row.email,
    hasAccount: row.accountId !== null,
  };
}

export function toGuardianLink(row: LinkRow): GuardianLink {
  const openCode = row.activationCodes[0];

  return {
    id: row.id,
    status: row.status,
    relationship: row.relationship,
    guardian: toGuardian(row.guardian),
    consentAt: row.consentAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    facilityName: row.facility.name,
    pendingCodeExpiresAt: row.status === 'PENDING' && openCode !== undefined ? openCode.expiresAt.toISOString() : null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revocationReason: row.revocationReason,
    version: row.version,
  };
}

export function toChildRecord(row: ChildRecordRow): ChildRecord {
  const birth = row.birthRecord;

  return {
    ...toChildSummary(row),
    gestationalWeeks: row.gestationalWeeks,
    bloodType: toBloodType(row.bloodType),
    birth:
      birth === null
        ? null
        : {
            birthPlace: birth.birthPlace,
            deliveryType: birth.deliveryType,
            weightGrams: birth.weightGrams,
            lengthCm: birth.lengthCm?.toFixed(1) ?? null,
            headCircumferenceCm: birth.headCircumferenceCm?.toFixed(1) ?? null,
            apgar1: birth.apgar1,
            apgar5: birth.apgar5,
          },
    links: row.links.map(toGuardianLink),
    version: row.version,
  };
}

export function fullName(person: { givenNames: string; paternalSurname: string; maternalSurname: string }): string {
  return `${person.givenNames} ${person.paternalSurname} ${person.maternalSurname}`.replace(/\s+/g, ' ').trim();
}
