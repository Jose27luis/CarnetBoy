import type { AccountStatus, AppointmentType, CatalogKind, CatalogStatus, Role } from '@carnet/contracts';

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
