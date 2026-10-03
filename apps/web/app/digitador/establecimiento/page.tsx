import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { assignedFacilities, currentFacility } from '@/lib/digitizer-session';
import { PANEL_CLASS } from '@/lib/ui';
import { selectFacilityAction } from './actions';

export const metadata: Metadata = { title: 'Establecimiento' };

export default async function FacilitySelectionPage(): Promise<React.JSX.Element> {
  const [facilities, current] = await Promise.all([assignedFacilities(), currentFacility()]);

  return (
    <>
      <PageHeader
        title="¿Dónde estás trabajando hoy?"
        description="Cada atención que registres queda a nombre de este establecimiento."
      />
      {facilities.length === 0 ? (
        <EmptyState title="No tienes establecimientos asignados">
          Pide a un administrador que te asigne al establecimiento donde trabajas. Mientras tanto no podrás registrar atenciones.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {facilities.map((facility) => (
            <li key={facility.id} className={`${PANEL_CLASS} flex flex-col gap-3 p-5 ${current?.id === facility.id ? 'border-celeste-500' : ''}`}>
              <div>
                <p className="font-display text-lg font-semibold">{facility.name}</p>
                <p className="text-sm text-muted">IPRESS {facility.ipressCode}</p>
              </div>
              {current?.id === facility.id ? (
                <p className="text-sm font-semibold text-ok">Establecimiento actual</p>
              ) : (
                <ActionForm
                  action={selectFacilityAction}
                  label="Trabajar aquí"
                  pendingLabel="Cambiando"
                  variant="primary"
                  compact={false}
                  fields={{ facilityId: facility.id }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
