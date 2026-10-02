'use client';

import { PASSWORD_MIN_LENGTH } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormMessage } from '@/components/form-message';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { initialPasswordAction } from '../actions';

export function PasswordForm(): React.JSX.Element {
  const [state, action] = useActionState(initialPasswordAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-5">
      <PasswordField
        label="Nueva contraseña"
        name="newPassword"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        help={`Al menos ${PASSWORD_MIN_LENGTH} caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.`}
        error={fieldError(state, 'newPassword')}
      />
      <PasswordField label="Repite la nueva contraseña" name="confirmation" autoComplete="new-password" error={fieldError(state, 'confirmation')} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Guardando" className="mt-1 w-full text-base">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
