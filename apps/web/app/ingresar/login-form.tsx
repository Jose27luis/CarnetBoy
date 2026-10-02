'use client';

import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { loginAction } from './actions';

export function LoginForm({ next }: { next: string | null }): React.JSX.Element {
  const [state, action] = useActionState(loginAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      {next === null ? null : <input type="hidden" name="next" value={next} />}
      <FormField label="Correo" name="email" type="email" inputMode="email" autoComplete="username" error={fieldError(state, 'email')} />
      <FormField label="Contraseña" name="password" type="password" autoComplete="current-password" error={fieldError(state, 'password')} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Ingresando">Ingresar</SubmitButton>
    </form>
  );
}
