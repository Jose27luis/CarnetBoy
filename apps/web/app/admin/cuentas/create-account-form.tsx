'use client';

import { STAFF_ROLES } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { ROLE_LABEL } from '@/lib/labels';
import { createAccountAction } from './actions';

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }));

export function CreateAccountForm(): React.JSX.Element {
  const [state, action] = useActionState(createAccountAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr]">
        <FormField label="Nombre completo" name="fullName" maxLength={160} error={fieldError(state, 'fullName')} />
        <FormField label="Correo" name="email" type="email" inputMode="email" error={fieldError(state, 'email')} />
        <SelectField label="Rol" name="role" options={ROLE_OPTIONS} defaultValue="DIGITIZER" error={fieldError(state, 'role')} />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Creando">Crear cuenta</SubmitButton>
      </div>
    </form>
  );
}
