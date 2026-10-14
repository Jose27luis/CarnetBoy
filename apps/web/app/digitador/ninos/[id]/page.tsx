import type {
  AnemiaOverview,
  ChildRecord,
  ChildSchedule,
  GrowthBands,
  GrowthCheckRecord,
  GuardianLink,
  ImmunizationStatus,
  PendingCorrection,
} from '@carnet/contracts';
import { Baby, ChevronLeft, Droplets, HeartPulse, IdCard, type LucideIcon, MapPin, Ruler, Scale, Stethoscope, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { digitizerApi } from '@/lib/digitizer-session';
import { webEnv } from '@/lib/env';
import {
  ANEMIA_LABEL,
  APPOINTMENT_TYPE_LABEL,
  childDocument,
  daysBetween,
  DELIVERY_TYPE_LABEL,
  describeAgeFrom,
  formatCalendarDate,
  formatDateTime,
  GROWTH_CLASS_LABEL,
  LINK_STATUS_LABEL,
  LINK_STATUS_TONE,
  personName,
  RELATIONSHIP_LABEL,
  SEX_LABEL,
  todayInLima,
} from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { AnemiaSection } from './anemia-section';
import { AppointmentsSection } from './appointments-section';
import { ChildHero } from './child-hero';
import { type ChildStat, ChildStats, type StatTone } from './child-stats';
import { CHILD_TABS, type ChildTab } from './child-tab-list';
import { ChildTabs, TabPanel } from './child-tabs';
import { GrowthSection } from './growth-section';
import { LinkGuardian } from './link-guardian';
import { ReissueCode } from './reissue-code';
import { VaccinesSection } from './vaccines-section';

export const metadata: Metadata = { title: 'Ficha del niño' };

interface ChildPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seccion?: string | string[] }>;
}

interface ClinicalData {
  status: ImmunizationStatus;
  checks: GrowthCheckRecord[];
  anemia: AnemiaOverview;
  schedule: ChildSchedule;
  pendingIds: ReadonlySet<string>;
}

function activeTab(value: string | string[] | undefined): ChildTab {
  return CHILD_TABS.find((tab) => tab.slug === value)?.slug ?? 'datos';
}

async function loadSection<T>(path: string): Promise<T> {
  const result = await digitizerApi<T>(path);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  return result.data;
}

async function loadClinical(childId: string): Promise<ClinicalData> {
  const [status, checks, anemia, schedule, pending] = await Promise.all([
    loadSection<ImmunizationStatus>(`/v1/children/${childId}/immunization`),
    loadSection<GrowthCheckRecord[]>(`/v1/children/${childId}/growth-checks`),
    loadSection<AnemiaOverview>(`/v1/children/${childId}/anemia`),
    loadSection<ChildSchedule>(`/v1/children/${childId}/appointments`),
    loadSection<PendingCorrection[]>(`/v1/children/${childId}/corrections`),
  ]);

  return { status, checks, anemia, schedule, pendingIds: new Set(pending.map((item) => item.recordId)) };
}

function growthTone(value: string | null): StatTone {
  if (value === null) {
    return 'neutral';
  }

  if (value === 'NORMAL') {
    return 'ok';
  }

  return value.startsWith('SEVERELY') || value === 'OBESE' ? 'danger' : 'warn';
}

function statsOf(childId: string, data: ClinicalData): ChildStat[] {
  const base = `/digitador/ninos/${childId}?seccion=`;
  const doses = data.status.doses;
  const applied = doses.filter((dose) => dose.status === 'APPLIED').length;
  const due = doses.filter((dose) => dose.status === 'DUE').length;
  const overdue = doses.filter((dose) => dose.status === 'OVERDUE').length;
  const lastCheck = data.checks[0];
  const nutrition = lastCheck === undefined ? null : (lastCheck.weightForLength ?? lastCheck.weightForAge);
  const lastTest = data.anemia.tests[0];
  const next = data.schedule.upcoming[0];

  return [
    {
      kind: 'vaccines',
      label: 'Vacunas',
      value: data.status.schedule === null ? 'Sin esquema' : `${applied} aplicadas`,
      hint: data.status.schedule === null ? 'El esquema no está publicado' : overdue > 0 ? `${overdue} vencidas` : due > 0 ? `${due} pendientes ahora` : 'Al día',
      tone: data.status.schedule === null ? 'neutral' : overdue > 0 ? 'danger' : due > 0 ? 'warn' : 'ok',
      href: `${base}vacunas`,
    },
    {
      kind: 'growth',
      label: 'Último control',
      value: lastCheck === undefined ? 'Sin controles' : `${Number(lastCheck.weightKg).toLocaleString('es-PE', { maximumFractionDigits: 2 })} kg · ${lastCheck.lengthCm} cm`,
      hint: lastCheck === undefined ? 'Registra el primero' : `${GROWTH_CLASS_LABEL[nutrition ?? ''] ?? 'Sin referencia'}, ${formatCalendarDate(lastCheck.measuredOn)}`,
      tone: growthTone(nutrition),
      href: `${base}crecimiento`,
    },
    {
      kind: 'hemoglobin',
      label: 'Hemoglobina',
      value: lastTest === undefined ? 'Sin dosajes' : `${lastTest.adjusted} g/dL`,
      hint: lastTest === undefined ? 'Aún no tiene dosajes' : `${ANEMIA_LABEL[lastTest.classification]}, ${formatCalendarDate(lastTest.testedOn)}`,
      tone: lastTest === undefined ? 'neutral' : lastTest.classification === 'NONE' ? 'ok' : lastTest.classification === 'MILD' ? 'warn' : lastTest.classification === 'UNCLASSIFIED' ? 'neutral' : 'danger',
      href: `${base}hemoglobina`,
    },
    {
      kind: 'appointment',
      label: 'Próxima cita',
      value: next === undefined ? 'Sin cita' : formatCalendarDate(next.scheduledOn),
      hint: next === undefined ? (data.schedule.proposals.length > 0 ? 'Hay fechas sugeridas' : 'Programa la siguiente') : APPOINTMENT_TYPE_LABEL[next.type],
      tone: next === undefined ? 'warn' : 'neutral',
      href: `${base}citas`,
    },
  ];
}

async function ClinicalSection({ tab, child, data }: { tab: Exclude<ChildTab, 'datos'>; child: ChildRecord; data: ClinicalData }): Promise<React.JSX.Element> {
  if (tab === 'citas') {
    return <AppointmentsSection childId={child.id} schedule={data.schedule} />;
  }

  if (tab === 'vacunas') {
    return <VaccinesSection childId={child.id} birthDate={child.birthDate} status={data.status} pendingIds={data.pendingIds} />;
  }

  if (tab === 'crecimiento') {
    const bands = await loadSection<GrowthBands>(`/v1/children/${child.id}/growth-checks/bands`);

    return (
      <GrowthSection
        childId={child.id}
        birthDate={child.birthDate}
        ageDays={daysBetween(child.birthDate, todayInLima())}
        checks={data.checks}
        supplies={data.anemia.supplies}
        bands={bands}
        pendingIds={data.pendingIds}
      />
    );
  }

  return <AnemiaSection childId={child.id} birthDate={child.birthDate} overview={data.anemia} pendingIds={data.pendingIds} />;
}

function DetailTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-canvas p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-celeste-700 shadow-sm">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
        <dd className={`truncate font-semibold ${value === null ? 'text-muted' : ''}`}>{value ?? 'Sin registrar'}</dd>
      </div>
    </div>
  );
}

function guardianInitials(name: string): string {
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function LinkCard({ link, child, activationUrl }: { link: GuardianLink; child: ChildRecord; activationUrl: string }): React.JSX.Element {
  const guardianName = personName(link.guardian);
  const canReissue = link.status === 'PENDING' || link.status === 'EXPIRED';

  return (
    <li className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-4 transition-colors hover:border-celeste-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-celeste-100 font-display font-semibold text-celeste-800">
            {guardianInitials(guardianName)}
          </span>
          <div>
            <p className="font-semibold">{guardianName}</p>
            <p className="text-sm text-muted">
              {RELATIONSHIP_LABEL[link.relationship]}. DNI {link.guardian.dni}
              {link.guardian.phone === null ? '' : `. Celular ${link.guardian.phone}`}
            </p>
          </div>
        </div>
        <Badge tone={LINK_STATUS_TONE[link.status]}>{LINK_STATUS_LABEL[link.status]}</Badge>
      </div>
      <p className="text-sm text-muted">
        Vinculado en {link.facilityName} el {formatDateTime(link.createdAt)}.
        {link.pendingCodeExpiresAt === null ? '' : ` El código vence el ${formatDateTime(link.pendingCodeExpiresAt)}.`}
        {link.revocationReason === null ? '' : ` Revocado: ${link.revocationReason}.`}
      </p>
      {canReissue ? (
        <ReissueCode linkId={link.id} childId={child.id} childName={personName(child)} guardianName={guardianName} activationUrl={activationUrl} />
      ) : null}
    </li>
  );
}

function DataSection({ child, activationUrl }: { child: ChildRecord; activationUrl: string }): React.JSX.Element {
  const birth = child.birth;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="flex flex-col gap-6 print:hidden">
        <section aria-labelledby="data" className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
          <h2 id="data" className="flex items-center gap-2 text-lg font-semibold">
            <Baby aria-hidden="true" className="size-5 text-celeste-700" />
            Datos del niño
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            <DetailTile icon={IdCard} label="DNI" value={child.dni} />
            <DetailTile icon={IdCard} label="CNV" value={child.cnv} />
            <DetailTile icon={Baby} label="Semanas de gestación" value={child.gestationalWeeks === null ? null : `${child.gestationalWeeks} semanas`} />
            <DetailTile icon={Droplets} label="Grupo sanguíneo" value={child.bloodType} />
          </dl>
        </section>

        <section aria-labelledby="birth" className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
          <h2 id="birth" className="flex items-center gap-2 text-lg font-semibold">
            <Stethoscope aria-hidden="true" className="size-5 text-celeste-700" />
            Nacimiento
          </h2>
          {birth === null ? (
            <EmptyState title="Sin datos de nacimiento">Puedes agregarlos con Corregir datos.</EmptyState>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              <DetailTile icon={MapPin} label="Lugar" value={birth.birthPlace} />
              <DetailTile icon={Stethoscope} label="Parto" value={birth.deliveryType === null ? null : DELIVERY_TYPE_LABEL[birth.deliveryType]} />
              <DetailTile icon={Scale} label="Peso" value={birth.weightGrams === null ? null : `${birth.weightGrams} g`} />
              <DetailTile icon={Ruler} label="Talla" value={birth.lengthCm === null ? null : `${birth.lengthCm} cm`} />
              <DetailTile icon={Ruler} label="Perímetro cefálico" value={birth.headCircumferenceCm === null ? null : `${birth.headCircumferenceCm} cm`} />
              <DetailTile
                icon={HeartPulse}
                label="APGAR (1 y 5 min)"
                value={birth.apgar1 === null && birth.apgar5 === null ? null : `${birth.apgar1 ?? '-'} / ${birth.apgar5 ?? '-'}`}
              />
            </dl>
          )}
        </section>
      </div>

      <section aria-labelledby="guardians" className={`${PANEL_CLASS} flex flex-col gap-5 p-5`}>
        <h2 id="guardians" className="flex items-center gap-2 text-lg font-semibold print:hidden">
          <UsersRound aria-hidden="true" className="size-5 text-celeste-700" />
          Apoderados
        </h2>
        {child.links.length === 0 ? (
          <div className="print:hidden">
            <EmptyState title="Sin apoderados vinculados">Vincula a la madre, el padre u otro apoderado para que vean el carnet.</EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {child.links.map((link) => (
              <LinkCard key={link.id} link={link} child={child} activationUrl={activationUrl} />
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-3 rounded-[16px] border border-dashed border-celeste-200 bg-celeste-50/60 p-4">
          <h3 className="font-semibold print:hidden">Vincular apoderado</h3>
          <LinkGuardian childId={child.id} childName={personName(child)} activationUrl={activationUrl} />
        </div>
      </section>
    </div>
  );
}

export default async function ChildPage({ params, searchParams }: ChildPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const tab = activeTab((await searchParams).seccion);

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const result = await digitizerApi<ChildRecord>(`/v1/children/${id}`);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    if (result.status === 404) {
      notFound();
    }

    throw new Error(result.error.message);
  }

  const child = result.data;
  const clinical = await loadClinical(child.id);
  const activationUrl = `${new URL(webEnv().WEB_URL).host}/activar`;
  const preterm = child.gestationalWeeks !== null && child.gestationalWeeks < 37 ? `Prematuro, ${child.gestationalWeeks} semanas` : null;

  return (
    <>
      <Link href="/digitador" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-celeste-700 hover:underline print:hidden">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a la búsqueda
      </Link>

      <ChildHero
        childId={child.id}
        fullName={personName(child)}
        sex={child.sex}
        sexLabel={SEX_LABEL[child.sex]}
        age={describeAgeFrom(child.birthDate, todayInLima())}
        document={childDocument(child)}
        birthDate={formatCalendarDate(child.birthDate)}
        preterm={preterm}
      />

      <ChildStats stats={statsOf(child.id, clinical)} />

      <ChildTabs childId={child.id} active={tab} />

      <TabPanel tab={tab}>
        {tab === 'datos' ? <DataSection child={child} activationUrl={activationUrl} /> : <ClinicalSection tab={tab} child={child} data={clinical} />}
      </TabPanel>
    </>
  );
}
