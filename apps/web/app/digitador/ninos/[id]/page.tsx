import type {
  AnemiaOverview,
  ChildRecord,
  ChildSchedule,
  GrowthCheckRecord,
  GuardianLink,
  ImmunizationStatus,
  PendingCorrection,
} from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { digitizerApi } from '@/lib/digitizer-session';
import { webEnv } from '@/lib/env';
import {
  childDocument,
  DELIVERY_TYPE_LABEL,
  describeAgeFrom,
  formatCalendarDate,
  formatDateTime,
  LINK_STATUS_LABEL,
  LINK_STATUS_TONE,
  personName,
  RELATIONSHIP_LABEL,
  SEX_LABEL,
  todayInLima,
} from '@/lib/labels';
import { buttonClass, PANEL_CLASS } from '@/lib/ui';
import { AnemiaSection } from './anemia-section';
import { AppointmentsSection } from './appointments-section';
import { CHILD_TABS, type ChildTab, ChildTabs } from './child-tabs';
import { GrowthSection } from './growth-section';
import { LinkGuardian } from './link-guardian';
import { ReissueCode } from './reissue-code';
import { VaccinesSection } from './vaccines-section';

export const metadata: Metadata = { title: 'Ficha del niño' };

interface ChildPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seccion?: string | string[] }>;
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

async function ClinicalSection({ tab, child }: { tab: Exclude<ChildTab, 'datos'>; child: ChildRecord }): Promise<React.JSX.Element> {
  if (tab === 'citas') {
    const schedule = await loadSection<ChildSchedule>(`/v1/children/${child.id}/appointments`);
    return <AppointmentsSection childId={child.id} schedule={schedule} />;
  }

  const pending = await loadSection<PendingCorrection[]>(`/v1/children/${child.id}/corrections`);
  const pendingIds = new Set(pending.map((item) => item.recordId));

  if (tab === 'vacunas') {
    const status = await loadSection<ImmunizationStatus>(`/v1/children/${child.id}/immunization`);
    return <VaccinesSection childId={child.id} birthDate={child.birthDate} status={status} pendingIds={pendingIds} />;
  }

  if (tab === 'crecimiento') {
    const checks = await loadSection<GrowthCheckRecord[]>(`/v1/children/${child.id}/growth-checks`);
    return <GrowthSection childId={child.id} birthDate={child.birthDate} checks={checks} pendingIds={pendingIds} />;
  }

  const overview = await loadSection<AnemiaOverview>(`/v1/children/${child.id}/anemia`);
  return <AnemiaSection childId={child.id} birthDate={child.birthDate} overview={overview} pendingIds={pendingIds} />;
}

function Detail({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{value ?? 'Sin registrar'}</dd>
    </div>
  );
}

function LinkCard({ link, child, activationUrl }: { link: GuardianLink; child: ChildRecord; activationUrl: string }): React.JSX.Element {
  const guardianName = personName(link.guardian);
  const canReissue = link.status === 'PENDING' || link.status === 'EXPIRED';

  return (
    <li className="flex flex-col gap-3 rounded-(--radius-control) border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{guardianName}</p>
          <p className="text-sm text-muted">
            {RELATIONSHIP_LABEL[link.relationship]}. DNI {link.guardian.dni}
            {link.guardian.phone === null ? '' : `. Celular ${link.guardian.phone}`}
          </p>
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
  const activationUrl = `${new URL(webEnv().WEB_URL).host}/activar`;

  return (
    <>
      <Link href="/digitador" className="mb-4 inline-block text-sm font-semibold text-celeste-700 hover:underline print:hidden">
        Volver a la búsqueda
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{personName(child)}</h1>
          <p className="text-muted">
            {SEX_LABEL[child.sex]}, {describeAgeFrom(child.birthDate, todayInLima())}. {childDocument(child)}
          </p>
        </div>
        <Link href={`/digitador/ninos/${child.id}/editar`} className={buttonClass('secondary')}>
          Corregir datos
        </Link>
      </div>

      <ChildTabs childId={child.id} active={tab} />

      {tab === 'datos' ? <DataSection child={child} activationUrl={activationUrl} /> : <ClinicalSection tab={tab} child={child} />}
    </>
  );
}

function DataSection({ child, activationUrl }: { child: ChildRecord; activationUrl: string }): React.JSX.Element {
  const birth = child.birth;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section aria-labelledby="data" className={`${PANEL_CLASS} flex flex-col gap-5 p-5 print:hidden`}>
        <h2 id="data" className="text-lg font-semibold">
          Datos
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Detail label="DNI" value={child.dni} />
          <Detail label="CNV" value={child.cnv} />
          <Detail label="Fecha de nacimiento" value={formatCalendarDate(child.birthDate)} />
          <Detail label="Semanas de gestación" value={child.gestationalWeeks?.toString() ?? null} />
          <Detail label="Grupo sanguíneo" value={child.bloodType} />
        </dl>
        <h3 className="border-t border-line pt-4 font-semibold">Nacimiento</h3>
        {birth === null ? (
          <p className="text-sm text-muted">Sin datos de nacimiento.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            <Detail label="Lugar" value={birth.birthPlace} />
            <Detail label="Parto" value={birth.deliveryType === null ? null : DELIVERY_TYPE_LABEL[birth.deliveryType]} />
            <Detail label="Peso" value={birth.weightGrams === null ? null : `${birth.weightGrams} g`} />
            <Detail label="Talla" value={birth.lengthCm === null ? null : `${birth.lengthCm} cm`} />
            <Detail label="Perímetro cefálico" value={birth.headCircumferenceCm === null ? null : `${birth.headCircumferenceCm} cm`} />
            <Detail label="APGAR" value={birth.apgar1 === null && birth.apgar5 === null ? null : `${birth.apgar1 ?? '-'} / ${birth.apgar5 ?? '-'}`} />
          </dl>
        )}
      </section>

      <section aria-labelledby="guardians" className={`${PANEL_CLASS} flex flex-col gap-5 p-5`}>
        <h2 id="guardians" className="text-lg font-semibold print:hidden">
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
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="font-semibold print:hidden">Vincular apoderado</h3>
          <LinkGuardian childId={child.id} childName={personName(child)} activationUrl={activationUrl} />
        </div>
      </section>
    </div>
  );
}
