import type { Vaccine } from '@carnet/contracts';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { VaccineForm } from './vaccine-form';

export const metadata: Metadata = { title: 'Vacunas' };

export default async function VaccinesPage(): Promise<React.JSX.Element> {
  const vaccines = await loadOrFail<Vaccine[]>('/v1/admin/vaccines');

  return (
    <>
      <PageHeader
        eyebrow="Catálogos"
        title="Vacunas"
        description="Lista de vacunas que luego se usan en los esquemas. Cárgalas tal como figuran en la norma técnica vigente."
      />

      <section aria-labelledby="new-vaccine" className={`${PANEL_CLASS} mb-8 p-5`}>
        <h2 id="new-vaccine" className="mb-4 text-lg font-semibold">
          Nueva vacuna
        </h2>
        <VaccineForm />
      </section>

      {vaccines.length === 0 ? (
        <EmptyState title="Todavía no hay vacunas">Registra las vacunas del esquema nacional antes de armar un esquema.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {vaccines.map((vaccine) => (
            <li key={vaccine.id} className={`${PANEL_CLASS} p-5`}>
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold">
                      {vaccine.name} <span className="font-mono text-sm font-normal text-muted">{vaccine.code}</span>
                    </span>
                    <span className="block text-sm text-muted">Previene: {vaccine.prevents}</span>
                  </span>
                  <span className="text-sm font-semibold text-celeste-700">Editar</span>
                </summary>
                <div className="mt-5 border-t border-line pt-5">
                  <VaccineForm vaccine={vaccine} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
