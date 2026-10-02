import type { Facility } from '@carnet/contracts';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { toggleFacilityAction } from './actions';
import { FacilityForm } from './facility-form';

export const metadata: Metadata = { title: 'Establecimientos' };

const ALTITUDE_FORMAT = new Intl.NumberFormat('es-PE');

export default async function FacilitiesPage(): Promise<React.JSX.Element> {
  const facilities = await loadOrFail<Facility[]>('/v1/admin/facilities');

  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Establecimientos"
        description="Centros asistenciales donde trabajan los digitadores. Un establecimiento desactivado deja de recibir asignaciones, pero conserva su historial."
      />

      <section aria-labelledby="new-facility" className={`${PANEL_CLASS} mb-8 p-5`}>
        <h2 id="new-facility" className="mb-4 text-lg font-semibold">
          Nuevo establecimiento
        </h2>
        <FacilityForm />
      </section>

      {facilities.length === 0 ? (
        <EmptyState title="Todavía no hay establecimientos">Registra el primero con el formulario de arriba.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {facilities.map((facility) => (
            <li key={facility.id} className={`${PANEL_CLASS} p-5`}>
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold">{facility.name}</span>
                    <span className="block text-sm text-muted">
                      IPRESS {facility.ipressCode} · {facility.healthNetwork} · {ALTITUDE_FORMAT.format(facility.altitudeMeters)} m s. n. m.
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={facility.active ? 'ok' : 'neutral'}>{facility.active ? 'Activo' : 'Desactivado'}</Badge>
                    <span className="text-sm font-semibold text-celeste-700">Editar</span>
                  </span>
                </summary>
                <div className="mt-5 flex flex-col gap-5 border-t border-line pt-5">
                  <FacilityForm facility={facility} />
                  <ActionForm
                    action={toggleFacilityAction}
                    label={facility.active ? 'Desactivar establecimiento' : 'Activar establecimiento'}
                    pendingLabel="Guardando"
                    variant={facility.active ? 'danger' : 'secondary'}
                    compact={false}
                    {...(facility.active ? { confirm: `¿Desactivar ${facility.name}? No se podrán asignar digitadores nuevos.` } : {})}
                    fields={{ facilityId: facility.id, expectedVersion: facility.version, active: String(!facility.active) }}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
