'use client';

import { useActionState } from 'react';
import { ActivationSlip } from '@/components/activation-slip';
import { SubmitButton } from '@/components/submit-button';
import { type CodeState, reissueCodeAction } from './actions';

interface ReissueCodeProps {
  linkId: string;
  childId: string;
  childName: string;
  guardianName: string;
  activationUrl: string;
}

const IDLE_CODE: CodeState = { status: 'idle' };

export function ReissueCode({ linkId, childId, childName, guardianName, activationUrl }: ReissueCodeProps): React.JSX.Element {
  const [state, action] = useActionState(reissueCodeAction, IDLE_CODE);

  if (state.status === 'issued') {
    return (
      <ActivationSlip
        code={state.activationCode}
        expiresAt={state.codeExpiresAt}
        childName={childName}
        guardianName={guardianName}
        activationUrl={activationUrl}
      />
    );
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`¿Emitir un código nuevo para ${guardianName}? El código anterior dejará de funcionar.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="childId" value={childId} />
      <div>
        <SubmitButton pendingLabel="Emitiendo" variant="secondary" className="min-h-9 px-3 text-sm">
          Emitir código nuevo
        </SubmitButton>
      </div>
      {state.status === 'error' ? <p className="text-sm text-danger">{state.message}</p> : null}
    </form>
  );
}
