'use client';

import type { NotificationSettings } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { CheckboxField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE, submittedValue } from '@/lib/form-state';
import { updateNotificationsAction } from '@/app/carnet/actions';

export function NotificationForm({ settings }: { settings: NotificationSettings }): React.JSX.Element {
  const [state, action] = useActionState(updateNotificationsAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <CheckboxField label="Recibir avisos por correo" name="emailEnabled" defaultChecked={settings.emailEnabled} />
      <FormField
        label="Correo para los avisos"
        name="email"
        type="email"
        inputMode="email"
        required={false}
        defaultValue={submittedValue(state, 'email', settings.email ?? undefined)}
        help={settings.registeredEmail === null ? 'Escribe el correo donde quieres recibirlos.' : `Si lo dejas vacío, usamos ${settings.registeredEmail}.`}
        error={fieldError(state, 'email')}
      />
      <CheckboxField label="Recibir avisos en pantalla en los equipos que actives" name="pushEnabled" defaultChecked={settings.pushEnabled} />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">Guardar preferencias</SubmitButton>
      </div>
    </form>
  );
}
