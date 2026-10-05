import type {
  AccountStatus,
  AnemiaClass,
  AppointmentType,
  CatalogKind,
  CatalogStatus,
  ClinicalRecordType,
  CorrectionStatus,
  DeliveryType,
  DoseStatus,
  IronProduct,
  IronPurpose,
  LinkStatus,
  MeasurementPosition,
  Relationship,
  Role,
  Sex,
} from '@carnet/contracts';
import type { BadgeTone } from '@/components/badge';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  DIGITIZER: 'Digitador',
  GUARDIAN: 'Apoderado',
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
};

export const CATALOG_STATUS_LABEL: Record<CatalogStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
};

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  GROWTH_CHECK: 'Control CRED',
  VACCINATION: 'Vacunación',
  HEMOGLOBIN_TEST: 'Dosaje de hemoglobina',
};

export interface CatalogSection {
  slug: string;
  kind: CatalogKind;
  title: string;
  description: string;
  entryLabel: string;
}

export const CATALOG_SECTIONS: readonly CatalogSection[] = [
  {
    slug: 'esquemas',
    kind: 'VACCINATION_SCHEDULE',
    title: 'Esquemas de vacunación',
    description: 'Vacunas, dosis y edades del esquema nacional, por versión de la norma.',
    entryLabel: 'dosis',
  },
  {
    slug: 'hemoglobina',
    kind: 'HEMOGLOBIN_THRESHOLDS',
    title: 'Umbrales de hemoglobina',
    description: 'Valores ajustados que separan sin anemia, leve, moderada y severa, por rango de edad.',
    entryLabel: 'umbrales',
  },
  {
    slug: 'citas',
    kind: 'APPOINTMENT_INTERVALS',
    title: 'Intervalos de citas',
    description: 'Días entre controles CRED, vacunas y dosajes según la edad del niño.',
    entryLabel: 'intervalos',
  },
];

export function catalogSectionBySlug(slug: string): CatalogSection | undefined {
  return CATALOG_SECTIONS.find((section) => section.slug === slug);
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  'session.opened': 'inició sesión',
  'account.created': 'creó una cuenta',
  'account.password_changed': 'cambió su contraseña',
  'account.password_reset': 'generó una contraseña temporal',
  'account.totp_enrolled': 'activó la verificación en dos pasos',
  'account.totp_reset': 'reinició la verificación en dos pasos',
  'account.suspended': 'suspendió una cuenta',
  'account.reactivated': 'reactivó una cuenta',
  'facility.created': 'registró un establecimiento',
  'facility.updated': 'modificó un establecimiento',
  'facility.assignment_started': 'asignó un digitador',
  'facility.assignment_ended': 'quitó un digitador',
  'vaccine.created': 'registró una vacuna',
  'vaccine.updated': 'modificó una vacuna',
  'catalog_version.created': 'creó una versión de catálogo',
  'catalog_version.norm_changed': 'cambió la norma de un borrador',
  'catalog_version.entry_added': 'agregó una entrada a un borrador',
  'catalog_version.entry_removed': 'quitó una entrada de un borrador',
  'catalog_version.published': 'publicó una versión de catálogo',
  'dose.recorded': 'registró una vacuna aplicada',
  'growth_check.recorded': 'registró un control de crecimiento',
  'hemoglobin_test.recorded': 'registró un dosaje de hemoglobina',
  'iron_supply.recorded': 'registró una entrega de hierro',
  'record.corrected': 'corrigió un registro',
  'correction.requested': 'pidió corregir un registro',
  'correction.approved': 'aprobó una corrección',
  'correction.rejected': 'rechazó una corrección',
};

export function describeAuditAction(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

const DATE_FORMAT =new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
});

export function formatCalendarDate(value: string): string {
  return DATE_FORMAT.format(new Date(`${value}T12:00:00Z`));
}

export function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}

export function describeAgeInDays(days: number): string {
  if (days === 0) {
    return 'Al nacer';
  }

  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? '1 año' : `${years} años`;
  }

  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? '1 mes' : `${months} meses`;
  }

  return days === 1 ? '1 día' : `${days} días`;
}

export function describeAgeRange(minMonths: number, maxMonths: number): string {
  return `${minMonths} a ${maxMonths} meses`;
}

export const SEX_LABEL: Record<Sex, string> = {
  FEMALE: 'Niña',
  MALE: 'Niño',
};

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  VAGINAL: 'Vaginal',
  CESAREAN: 'Cesárea',
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  OTHER: 'Otro apoderado',
};

export const LINK_STATUS_LABEL: Record<LinkStatus, string> = {
  PENDING: 'Pendiente de activación',
  ACTIVE: 'Activo',
  EXPIRED: 'Código vencido',
  REVOKED: 'Revocado',
};

export const LINK_STATUS_TONE: Record<LinkStatus, 'celeste' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  PENDING: 'celeste',
  ACTIVE: 'ok',
  EXPIRED: 'warn',
  REVOKED: 'neutral',
};

export function personName(person: { givenNames: string; paternalSurname: string; maternalSurname: string }): string {
  return `${person.givenNames} ${person.paternalSurname} ${person.maternalSurname}`;
}

export function childDocument(child: { dni: string | null; cnv: string | null }): string {
  return child.dni === null ? `CNV ${child.cnv ?? ''}` : `DNI ${child.dni}`;
}

export function describeAgeFrom(birthDate: string, today: string): string {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = birthDate.split('-').map(Number);
  const [year = 0, month = 1, day = 1] = today.split('-').map(Number);
  const totalMonths = (year - birthYear) * 12 + (month - birthMonth) - (day < birthDay ? 1 : 0);

  if (totalMonths < 1) {
    const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(birthYear, birthMonth - 1, birthDay)) / 86_400_000);
    return days === 1 ? '1 día' : `${days} días`;
  }

  if (totalMonths < 24) {
    return totalMonths === 1 ? '1 mes' : `${totalMonths} meses`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return months === 0 ? `${years} años` : `${years} años y ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function todayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

export function describeScheduleAge(days: number): string {
  if (days === 0) {
    return 'Recién nacido';
  }

  if (days < 30) {
    return days === 1 ? '1 día' : `${days} días`;
  }

  const months = Math.round(days / 30.4375);

  if (months < 24) {
    return months === 1 ? '1 mes' : `${months} meses`;
  }

  const years = Math.round(days / 365.25);

  return years === 1 ? '1 año' : `${years} años`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const DOSE_STATUS_LABEL: Record<DoseStatus, string> = {
  FUTURE: 'Próxima',
  DUE: 'Pendiente',
  OVERDUE: 'Vencida',
  APPLIED: 'Aplicada',
};

export const DOSE_STATUS_TONE: Record<DoseStatus, BadgeTone> = {
  FUTURE: 'neutral',
  DUE: 'celeste',
  OVERDUE: 'danger',
  APPLIED: 'ok',
};

export const POSITION_LABEL: Record<MeasurementPosition, string> = {
  LYING: 'Echado (longitud)',
  STANDING: 'De pie (talla)',
};

export const GROWTH_CLASS_LABEL: Record<string, string> = {
  SEVERELY_UNDERWEIGHT: 'Bajo peso severo',
  UNDERWEIGHT: 'Bajo peso',
  SEVERELY_STUNTED: 'Talla baja severa',
  STUNTED: 'Talla baja',
  SEVERELY_WASTED: 'Desnutrición aguda severa',
  WASTED: 'Desnutrición aguda',
  OVERWEIGHT: 'Sobrepeso',
  OBESE: 'Obesidad',
  MICROCEPHALY: 'Perímetro cefálico bajo',
  MACROCEPHALY: 'Perímetro cefálico alto',
  NORMAL: 'Normal',
};

export function growthClassTone(value: string | null): BadgeTone {
  if (value === null) {
    return 'neutral';
  }

  if (value === 'NORMAL') {
    return 'ok';
  }

  return value.startsWith('SEVERELY') || value === 'OBESE' ? 'danger' : 'warn';
}

export const ANEMIA_LABEL: Record<AnemiaClass, string> = {
  NONE: 'Sin anemia',
  MILD: 'Anemia leve',
  MODERATE: 'Anemia moderada',
  SEVERE: 'Anemia severa',
  UNCLASSIFIED: 'Sin clasificación por edad',
};

export const ANEMIA_TONE: Record<AnemiaClass, BadgeTone> = {
  NONE: 'ok',
  MILD: 'warn',
  MODERATE: 'danger',
  SEVERE: 'danger',
  UNCLASSIFIED: 'neutral',
};

export const IRON_PRODUCT_LABEL: Record<IronProduct, string> = {
  DROPS: 'Gotas',
  SYRUP: 'Jarabe',
  MICRONUTRIENTS: 'Micronutrientes',
  TABLETS: 'Tabletas',
};

export const IRON_PURPOSE_LABEL: Record<IronPurpose, string> = {
  PREVENTION: 'Prevención',
  TREATMENT: 'Tratamiento',
};

export const RECORD_TYPE_LABEL: Record<ClinicalRecordType, string> = {
  DOSE: 'Vacuna aplicada',
  GROWTH_CHECK: 'Control de crecimiento',
  HEMOGLOBIN_TEST: 'Dosaje de hemoglobina',
  IRON_SUPPLY: 'Entrega de hierro',
};

export const CORRECTION_STATUS_LABEL: Record<CorrectionStatus, string> = {
  REQUESTED: 'Pendientes',
  APPROVED: 'Aprobadas',
  REJECTED: 'Rechazadas',
};

export const CORRECTION_FIELD_LABEL: Record<string, string> = {
  vaccine: 'Vacuna',
  administeredOn: 'Fecha de aplicación',
  lot: 'Lote',
  outOfRangeReason: 'Motivo fuera de rango',
  measuredOn: 'Fecha del control',
  weightKg: 'Peso (kg)',
  lengthCm: 'Talla (cm)',
  position: 'Posición',
  headCircumferenceCm: 'Perímetro cefálico (cm)',
  testedOn: 'Fecha del dosaje',
  observed: 'Hemoglobina observada (g/dL)',
  altitudeMeters: 'Altitud (m s. n. m.)',
  suppliedOn: 'Fecha de entrega',
  product: 'Producto',
  doseInstructions: 'Indicación',
  quantity: 'Cantidad',
  purpose: 'Finalidad',
};

export function describeCorrectionValue(field: string, value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return 'Sin dato';
  }

  const text = String(value);

  if (text.length === 0) {
    return 'Sin dato';
  }

  const enumLabel = ENUM_FIELD_LABELS.get(field)?.get(text);

  if (enumLabel !== undefined) {
    return enumLabel;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatCalendarDate(text) : text;
}

const ENUM_FIELD_LABELS = new Map<string, Map<string, string>>([
  ['position', new Map(Object.entries(POSITION_LABEL))],
  ['product', new Map(Object.entries(IRON_PRODUCT_LABEL))],
  ['purpose', new Map(Object.entries(IRON_PURPOSE_LABEL))],
]);
