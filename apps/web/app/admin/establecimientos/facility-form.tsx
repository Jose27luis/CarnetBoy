'use client';

import { ALTITUDE_MAX_METERS, ALTITUDE_MIN_METERS, type Facility } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { createFacilityAction, updateFacilityAction } from './actions';

const ALTITUDE_HELP = 'Metros sobre el nivel del mar. Se usa para ajustar la hemoglobina de cada dosaje.';

export function FacilityForm({ facility }: { facility?: Facility }): React.JSX.Element {
  const [state, action] = useActionState(facility === undefined ? createFacilityAction : updateFacilityAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      {facility === undefined ? null : (
        <>
          <input type="hidden" name="facilityId" value={facility.id} />
          <input type="hidden" name="expectedVersion" value={facility.version} />
        </>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {facility === undefined ? (
          <FormField
            label="Código IPRESS"
            name="ipressCode"
            inputMode="numeric"
            maxLength={8}
            pattern="[0-9]{8}"
            help="8 dígitos. No se puede cambiar después."
            error={fieldError(state, 'ipressCode')}
          />
        ) : null}
        <FormField label="Nombre" name="name" maxLength={160} defaultValue={facility?.name} error={fieldError(state, 'name')} />
        <FormField
          label="Red asistencial"
          name="healthNetwork"
          maxLength={120}
          defaultValue={facility?.healthNetwork}
          error={fieldError(state, 'healthNetwork')}
        />
        <FormField
          label="Altitud (m s. n. m.)"
          name="altitudeMeters"
          type="number"
          inputMode="numeric"
          min={ALTITUDE_MIN_METERS}
          max={ALTITUDE_MAX_METERS}
          defaultValue={facility?.altitudeMeters}
          help={ALTITUDE_HELP}
          error={fieldError(state, 'altitudeMeters')}
        />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando" variant={facility === undefined ? 'primary' : 'secondary'}>
          {facility === undefined ? 'Registrar establecimiento' : 'Guardar cambios'}
        </SubmitButton>
      </div>
    </form>
  );
}
