'use client';

import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { verifyTotpAction } from './actions';

export function TotpForm({ submitLabel }: { submitLabel: string }): React.JSX.Element {
  const [state, action] = useActionState(verifyTotpAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField
        label="Código de 6 dígitos"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        pattern="[0-9 ]{6,7}"
        help="Lo muestra tu aplicación de autenticación y cambia cada 30 segundos."
        error={fieldError(state, 'code')}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Verificando" className="mt-1 w-full text-base">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
