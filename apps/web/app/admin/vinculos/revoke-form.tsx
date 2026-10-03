'use client';

import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { revokeLinkAction } from './actions';

export function RevokeForm({ linkId, version, description }: { linkId: string; version: number; description: string }): React.JSX.Element {
  const [state, action] = useActionState(revokeLinkAction, IDLE);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`¿Revocar el vínculo de ${description}? El apoderado dejará de ver al niño de inmediato.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Motivo" name="reason" maxLength={500} help="Por ejemplo, orden judicial de alejamiento." error={fieldError(state, 'reason')} />
        <FormField label="Documento que lo sustenta" name="document" maxLength={160} help="Número de expediente, oficio o resolución." error={fieldError(state, 'document')} />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Revocando" variant="danger">
          Revocar vínculo
        </SubmitButton>
      </div>
    </form>
  );
}
