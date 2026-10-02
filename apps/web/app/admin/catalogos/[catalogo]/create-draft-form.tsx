'use client';

import { useActionState, useState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE } from '@/lib/form-state';
import { createDraftAction } from './actions';

interface CreateDraftFormProps {
  slug: string;
  sources: readonly { value: string; label: string }[];
}

export function CreateDraftForm({ slug, sources }: CreateDraftFormProps): React.JSX.Element {
  const [state, action] = useActionState(createDraftAction, IDLE);
  const [idempotencyKey] = useState(() => crypto.randomUUID().replaceAll('-', ''));

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Norma técnica de origen"
          name="norm"
          maxLength={240}
          help="Nombre y número de la norma de la que salen los valores."
          error={fieldError(state, 'norm')}
        />
        {sources.length === 0 ? null : (
          <SelectField
            label="Copiar entradas de"
            name="copyFromId"
            required={false}
            options={sources}
            help="Opcional. Útil cuando la norma nueva solo cambia algunas entradas."
            error={fieldError(state, 'copyFromId')}
          />
        )}
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Creando">Crear borrador</SubmitButton>
      </div>
    </form>
  );
}
