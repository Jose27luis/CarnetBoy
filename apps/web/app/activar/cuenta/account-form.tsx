'use client';

import { GUARDIAN_PASSWORD_MIN_LENGTH } from '@carnet/contracts';
import { useActionState } from 'react';
import { FloatingInput, FloatingPassword } from '@/components/floating-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { completeActivationAction } from '../actions';

export function AccountForm(): React.JSX.Element {
  const [state, action] = useActionState(completeActivationAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FloatingPassword
        label="Crea una contraseña"
        name="password"
        autoComplete="new-password"
        minLength={GUARDIAN_PASSWORD_MIN_LENGTH}
        help={`Al menos ${GUARDIAN_PASSWORD_MIN_LENGTH} caracteres. Con tu DNI y esta contraseña entrarás siempre.`}
        error={fieldError(state, 'password')}
      />
      <FloatingPassword label="Repite la contraseña" name="confirmation" autoComplete="new-password" error={fieldError(state, 'confirmation')} />
      <FloatingInput
        label="Correo (opcional)"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required={false}
        help="Solo para enviarte recordatorios de citas y vacunas."
        error={fieldError(state, 'email')}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Activando" className="mt-2 h-13 w-full text-base">
        Activar y entrar
      </SubmitButton>
    </form>
  );
}
