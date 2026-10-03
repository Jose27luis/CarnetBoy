'use client';

import { useActionState } from 'react';
import { FloatingInput } from '@/components/floating-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { verifyActivationAction } from './actions';

export function ActivationForm(): React.JSX.Element {
  const [state, action] = useActionState(verifyActivationAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FloatingInput label="Tu DNI" name="dni" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" autoComplete="username" error={fieldError(state, 'dni')} />
      <FloatingInput
        label="Código de activación"
        name="code"
        maxLength={9}
        autoCapitalize="characters"
        help="Son 8 letras y números. Te lo entregaron en tu establecimiento de salud."
        error={fieldError(state, 'code')}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Comprobando" className="mt-2 h-13 w-full text-base">
        Continuar
      </SubmitButton>
    </form>
  );
}
