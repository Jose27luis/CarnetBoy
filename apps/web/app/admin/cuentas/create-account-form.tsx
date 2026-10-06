'use client';

import { STAFF_ROLES } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { CheckboxField, PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE, submittedValue } from '@/lib/form-state';
import { ROLE_LABEL } from '@/lib/labels';
import { createAccountAction } from './actions';

export const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }));

export function CreateAccountForm(): React.JSX.Element {
  const [state, action] = useActionState(createAccountAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr]">
        <FormField label="Nombre completo" name="fullName" maxLength={160} defaultValue={submittedValue(state, 'fullName', undefined)} error={fieldError(state, 'fullName')} />
        <FormField label="Correo" name="email" type="email" inputMode="email" defaultValue={submittedValue(state, 'email', undefined)} error={fieldError(state, 'email')} />
        <SelectField label="Rol" name="role" options={ROLE_OPTIONS} defaultValue={submittedValue(state, 'role', 'DIGITIZER')} error={fieldError(state, 'role')} />
      </div>
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-start">
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          required={false}
          generator
          help="Opcional. Si la dejas vacía, se genera una temporal."
          error={fieldError(state, 'password')}
        />
        <div className="md:pt-9">
          <CheckboxField label="Pedir que la cambie en su primer ingreso" name="requirePasswordChange" defaultChecked />
        </div>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Creando">Crear cuenta</SubmitButton>
      </div>
    </form>
  );
}
