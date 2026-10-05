'use client';

import { ALTITUDE_MAX_METERS, ALTITUDE_MIN_METERS, type Facility } from '@carnet/contracts';
import { useActionState, useId } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, type FormState, IDLE, submittedValue } from '@/lib/form-state';
import { INPUT_CLASS } from '@/lib/ui';
import { createFacilityAction, updateFacilityAction } from './actions';

const ALTITUDE_HELP = 'Metros sobre el nivel del mar. Se usa para ajustar la hemoglobina de cada dosaje.';

interface FacilityFormProps {
  facility?: Facility;
  networks: readonly string[];
  onSaved: () => void;
}

export function FacilityForm({ facility, networks, onSaved }: FacilityFormProps): React.JSX.Element {
  const save = facility === undefined ? createFacilityAction : updateFacilityAction;
  const [state, action] = useActionState(async (previous: FormState, formData: FormData) => {
    const next = await save(previous, formData);

    if (next.status === 'success') {
      onSaved();
    }

    return next;
  }, IDLE);
  const networkListId = useId();
  const networkInputId = useId();
  const networkError = fieldError(state, 'healthNetwork');
  const value = (field: string, fallback: string | number | undefined): string | undefined =>
    submittedValue(state, field, fallback === undefined ? undefined : String(fallback));

  return (
    <form action={action} className="flex flex-col gap-5">
      {facility === undefined ? null : (
        <>
          <input type="hidden" name="facilityId" value={facility.id} />
          <input type="hidden" name="expectedVersion" value={facility.version} />
        </>
      )}
      {facility === undefined ? (
        <FormField
          label="Código IPRESS"
          name="ipressCode"
          inputMode="numeric"
          maxLength={8}
          pattern="[0-9]{8}"
          help="8 dígitos. No se puede cambiar después."
          defaultValue={value('ipressCode', undefined)}
          error={fieldError(state, 'ipressCode')}
        />
      ) : null}
      <FormField label="Nombre" name="name" maxLength={160} defaultValue={value('name', facility?.name)} error={fieldError(state, 'name')} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={networkInputId} className="text-sm font-semibold text-ink">
          Red asistencial
        </label>
        <input
          id={networkInputId}
          name="healthNetwork"
          list={networkListId}
          maxLength={120}
          required
          autoComplete="off"
          defaultValue={value('healthNetwork', facility?.healthNetwork)}
          aria-invalid={networkError ? true : undefined}
          className={INPUT_CLASS}
        />
        <datalist id={networkListId}>
          {networks.map((network) => (
            <option key={network} value={network} />
          ))}
        </datalist>
        {networkError ? <p className="text-sm text-danger">{networkError}</p> : <p className="text-sm text-muted">Elige una red existente o escribe una nueva.</p>}
      </div>
      <FormField
        label="Altitud (m s. n. m.)"
        name="altitudeMeters"
        type="number"
        inputMode="numeric"
        min={ALTITUDE_MIN_METERS}
        max={ALTITUDE_MAX_METERS}
        defaultValue={value('altitudeMeters', facility?.altitudeMeters)}
        help={ALTITUDE_HELP}
        error={fieldError(state, 'altitudeMeters')}
      />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">{facility === undefined ? 'Registrar establecimiento' : 'Guardar cambios'}</SubmitButton>
      </div>
    </form>
  );
}
