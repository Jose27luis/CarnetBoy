import type { CatalogVersion, CatalogVersionDetail, Vaccine } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
  APPOINTMENT_TYPE_LABEL,
  CATALOG_STATUS_LABEL,
  type CatalogSection,
  catalogSectionBySlug,
  describeAgeInDays,
  describeAgeRange,
  formatCalendarDate,
} from '@/lib/labels';
import { api, loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { removeEntryAction } from '../actions';
import { DoseForm, IntervalForm, NormForm, PublishForm, ThresholdForm, type VersionRef } from './entry-forms';

export const metadata: Metadata = { title: 'Versión de catálogo' };

interface VersionPageProps {
  params: Promise<{ catalogo: string; id: string }>;
}

const TH_CLASS = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const TD_CLASS = 'px-4 py-3 align-top';

function RemoveEntry({ reference, entryId, label }: { reference: VersionRef; entryId: string; label: string }): React.JSX.Element {
  return (
    <ActionForm
      action={removeEntryAction}
      label="Quitar"
      pendingLabel="Quitando"
      variant="ghost"
      confirm={`¿Quitar ${label} de este borrador?`}
      fields={{ ...reference, entryId }}
    />
  );
}

function EntriesTable({
  detail,
  reference,
  editable,
}: {
  detail: CatalogVersionDetail;
  reference: VersionRef;
  editable: boolean;
}): React.JSX.Element {
  if (detail.kind === 'VACCINATION_SCHEDULE') {
    return (
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-celeste-50">
          <tr>
            <th className={TH_CLASS}>Vacuna</th>
            <th className={TH_CLASS}>Dosis</th>
            <th className={TH_CLASS}>Edad recomendada</th>
            <th className={TH_CLASS}>Vence a los</th>
            {editable ? <th className={TH_CLASS}>Acción</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {detail.doses.map((dose) => (
            <tr key={dose.id}>
              <td className={TD_CLASS}>
                <span className="font-semibold">{dose.vaccine.name}</span>
                <span className="block text-muted">{dose.vaccine.prevents}</span>
              </td>
              <td className={TD_CLASS}>{dose.doseNumber}.ª</td>
              <td className={TD_CLASS}>
                {describeAgeInDays(dose.recommendedAgeDays)} <span className="text-muted">({dose.recommendedAgeDays} d)</span>
              </td>
              <td className={TD_CLASS}>
                {describeAgeInDays(dose.maxAgeDays)} <span className="text-muted">({dose.maxAgeDays} d)</span>
              </td>
              {editable ? (
                <td className={TD_CLASS}>
                  <RemoveEntry reference={reference} entryId={dose.id} label={`la ${dose.doseNumber}.ª dosis de ${dose.vaccine.name}`} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (detail.kind === 'HEMOGLOBIN_THRESHOLDS') {
    return (
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-celeste-50">
          <tr>
            <th className={TH_CLASS}>Edad</th>
            <th className={TH_CLASS}>Sin anemia</th>
            <th className={TH_CLASS}>Leve</th>
            <th className={TH_CLASS}>Moderada</th>
            <th className={TH_CLASS}>Severa</th>
            {editable ? <th className={TH_CLASS}>Acción</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {detail.thresholds.map((threshold) => (
            <tr key={threshold.id}>
              <td className={TD_CLASS}>{describeAgeRange(threshold.minAgeMonths, threshold.maxAgeMonths)}</td>
              <td className={TD_CLASS}>{threshold.normalFrom} o más</td>
              <td className={TD_CLASS}>
                {threshold.mildFrom} a menos de {threshold.normalFrom}
              </td>
              <td className={TD_CLASS}>
                {threshold.moderateFrom} a menos de {threshold.mildFrom}
              </td>
              <td className={TD_CLASS}>Menos de {threshold.moderateFrom}</td>
              {editable ? (
                <td className={TD_CLASS}>
                  <RemoveEntry
                    reference={reference}
                    entryId={threshold.id}
                    label={`el umbral de ${describeAgeRange(threshold.minAgeMonths, threshold.maxAgeMonths)}`}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full min-w-[560px] text-sm">
      <thead className="border-b border-line bg-celeste-50">
        <tr>
          <th className={TH_CLASS}>Tipo de cita</th>
          <th className={TH_CLASS}>Edad</th>
          <th className={TH_CLASS}>Siguiente cita</th>
          {editable ? <th className={TH_CLASS}>Acción</th> : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {detail.intervals.map((interval) => (
          <tr key={interval.id}>
            <td className={TD_CLASS}>{APPOINTMENT_TYPE_LABEL[interval.appointmentType]}</td>
            <td className={TD_CLASS}>{describeAgeRange(interval.minAgeMonths, interval.maxAgeMonths)}</td>
            <td className={TD_CLASS}>A los {interval.intervalDays} días</td>
            {editable ? (
              <td className={TD_CLASS}>
                <RemoveEntry reference={reference} entryId={interval.id} label="este intervalo" />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AddEntry({ section, reference, vaccines }: { section: CatalogSection; reference: VersionRef; vaccines: Vaccine[] }): React.JSX.Element {
  if (section.kind === 'VACCINATION_SCHEDULE') {
    return vaccines.length === 0 ? (
      <p className="text-muted">
        Primero registra las vacunas en{' '}
        <Link href="/admin/catalogos/vacunas" className="font-semibold text-celeste-700 underline">
          Vacunas
        </Link>
        .
      </p>
    ) : (
      <DoseForm reference={reference} vaccines={vaccines} />
    );
  }

  return section.kind === 'HEMOGLOBIN_THRESHOLDS' ? <ThresholdForm reference={reference} /> : <IntervalForm reference={reference} />;
}

export default async function CatalogVersionPage({ params }: VersionPageProps): Promise<React.JSX.Element> {
  const { catalogo, id } = await params;
  const section = catalogSectionBySlug(catalogo);

  if (section === undefined || !/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const detail = await api<CatalogVersionDetail>(`/v1/admin/catalogs/${id}`);

  if (!detail.ok) {
    notFound();
  }

  const version = detail.data;

  if (version.kind !== section.kind) {
    notFound();
  }

  const [vaccines, siblings] = await Promise.all([
    section.kind === 'VACCINATION_SCHEDULE' ? loadOrFail<Vaccine[]>('/v1/admin/vaccines') : Promise.resolve([]),
    loadOrFail<CatalogVersion[]>(`/v1/admin/catalogs?kind=${section.kind}`),
  ]);
  const current = siblings.find((sibling) => sibling.status === 'PUBLISHED' && sibling.validTo === null);
  const editable = version.status === 'DRAFT';
  const reference: VersionRef = { slug: section.slug, versionId: version.id, expectedVersion: version.version };
  const entryCount = version.doses.length + version.thresholds.length + version.intervals.length;

  return (
    <>
      <Link href={`/admin/catalogos/${section.slug}`} className="mb-4 inline-block text-sm font-semibold text-celeste-700 hover:underline">
        Volver a {section.title.toLowerCase()}
      </Link>
      <PageHeader
        eyebrow={section.title}
        title={version.norm}
        description={
          editable
            ? 'Borrador. Revisa cada entrada contra la norma antes de publicar.'
            : version.validTo === null
              ? `Publicada. Rige desde el ${formatCalendarDate(version.validFrom ?? '')}.`
              : `Publicada. Rigió del ${formatCalendarDate(version.validFrom ?? '')} al ${formatCalendarDate(version.validTo)}.`
        }
        actions={<Badge tone={editable ? 'warn' : 'neutral'}>{CATALOG_STATUS_LABEL[version.status]}</Badge>}
      />

      <section aria-labelledby="entries" className={`${PANEL_CLASS} mb-6 overflow-hidden`}>
        <h2 id="entries" className="border-b border-line px-5 py-4 text-lg font-semibold">
          {entryCount} {section.entryLabel}
        </h2>
        {entryCount === 0 ? (
          <div className="p-5">
            <EmptyState title="Sin entradas">Agrega la primera con el formulario de abajo.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <EntriesTable detail={version} reference={reference} editable={editable} />
          </div>
        )}
      </section>

      {editable ? (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="add-entry" className={`${PANEL_CLASS} p-5`}>
            <h2 id="add-entry" className="mb-4 text-lg font-semibold">
              Agregar
            </h2>
            <AddEntry section={section} reference={reference} vaccines={vaccines} />
          </section>

          <section aria-labelledby="norm" className={`${PANEL_CLASS} p-5`}>
            <h2 id="norm" className="mb-4 text-lg font-semibold">
              Norma de origen
            </h2>
            <NormForm reference={reference} norm={version.norm} />
          </section>

          <section aria-labelledby="publish" className="rounded-(--radius-panel) border border-celeste-200 bg-celeste-50 p-5">
            <h2 id="publish" className="mb-1 text-lg font-semibold">
              Publicar
            </h2>
            <p className="mb-4 text-sm text-muted">
              Desde la fecha que indiques, esta versión reemplaza a la vigente. Los registros anteriores conservan la versión con la que se hicieron.
            </p>
            <PublishForm reference={reference} minimumDate={current?.validFrom ?? null} />
          </section>
        </div>
      ) : null}
    </>
  );
}
