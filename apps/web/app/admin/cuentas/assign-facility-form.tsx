'use client';

import type { Facility } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { IDLE } from '@/lib/form-state';
import { INPUT_CLASS } from '@/lib/ui';
import { assignFacilityAction } from './actions';

export function AssignFacilityForm({ accountId, facilities }: { accountId: string; facilities: Facility[] }): React.JSX.Element {
  const [state, action] = useActionState(assignFacilityAction, IDLE);
  const selectId = `assign-${accountId}`;

  if (facilities.length === 0) {
    return <p className="text-sm text-muted">No quedan establecimientos activos por asignar.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="accountId" value={accountId} />
      <label htmlFor={selectId} className="text-sm font-semibold">
        Asignar establecimiento
      </label>
      <div className="flex flex-wrap gap-2">
        <select id={selectId} name="facilityId" required defaultValue="" className={`${INPUT_CLASS} min-h-9 flex-1 text-sm`}>
          <option value="" disabled>
            Elige un establecimiento
          </option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name} ({facility.ipressCode})
            </option>
          ))}
        </select>
        <SubmitButton pendingLabel="Asignando" variant="secondary" className="min-h-9 px-3 text-sm">
          Asignar
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
