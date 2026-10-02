'use client';

import { useActionState, useState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { loginAction } from './actions';

export function LoginForm({ next }: { next: string | null }): React.JSX.Element {
  const [state, action] = useActionState(loginAction, IDLE);
  const [email, setEmail] = useState('');

  return (
    <form action={action} className="flex flex-col gap-5">
      {next === null ? null : <input type="hidden" name="next" value={next} />}
      <FormField
        label="Correo"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        value={email}
        onValueChange={setEmail}
        error={fieldError(state, 'email')}
      />
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" error={fieldError(state, 'password')} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Ingresando" className="mt-1 w-full text-base">
        Ingresar
      </SubmitButton>
    </form>
  );
}
