'use client';

import type { Vaccine } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { createVaccineAction, updateVaccineAction } from './actions';

export function VaccineForm({ vaccine }: { vaccine?: Vaccine }): React.JSX.Element {
  const [state, action] = useActionState(vaccine === undefined ? createVaccineAction : updateVaccineAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      {vaccine === undefined ? null : <input type="hidden" name="vaccineId" value={vaccine.id} />}
      <div className={`grid gap-4 ${vaccine === undefined ? 'md:grid-cols-[0.6fr_1fr_1.4fr]' : 'md:grid-cols-[1fr_1.4fr]'}`}>
        {vaccine === undefined ? (
          <FormField
            label="Código"
            name="code"
            maxLength={32}
            help="Corto y sin espacios, por ejemplo NEUMO. No se puede cambiar."
            error={fieldError(state, 'code')}
          />
        ) : null}
        <FormField label="Nombre" name="name" maxLength={120} defaultValue={vaccine?.name} error={fieldError(state, 'name')} />
        <FormField
          label="Qué previene"
          name="prevents"
          maxLength={240}
          defaultValue={vaccine?.prevents}
          help="Se muestra a las familias en el pasaporte de vacunas."
          error={fieldError(state, 'prevents')}
        />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando" variant={vaccine === undefined ? 'primary' : 'secondary'}>
          {vaccine === undefined ? 'Registrar vacuna' : 'Guardar cambios'}
        </SubmitButton>
      </div>
    </form>
  );
}
