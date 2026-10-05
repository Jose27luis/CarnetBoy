'use client';

import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { rejectCorrectionAction } from './actions';

export function RejectForm({ correctionId }: { correctionId: string }): React.JSX.Element {
  const [state, action] = useActionState(rejectCorrectionAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="correctionId" value={correctionId} />
      <FormField label="Motivo del rechazo" name="reason" minLength={5} maxLength={300} help="El digitador lo verá en la auditoría." error={fieldError(state, 'reason')} />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Rechazando" variant="danger">
          Rechazar
        </SubmitButton>
      </div>
    </form>
  );
}
