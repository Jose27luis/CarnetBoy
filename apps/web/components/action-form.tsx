'use client';

import { useActionState } from 'react';
import { IDLE, type FormState } from '@/lib/form-state';
import type { ButtonVariant } from '@/lib/ui';
import { FormMessage } from './form-message';
import { SubmitButton } from './submit-button';

interface ActionFormProps {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  confirm?: string;
  fields?: Record<string, string | number>;
  compact?: boolean;
}

export function ActionForm({
  action,
  label,
  pendingLabel,
  variant = 'secondary',
  confirm,
  fields = {},
  compact = true,
}: ActionFormProps): React.JSX.Element {
  const [state, formAction] = useActionState(action, IDLE);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm !== undefined && !window.confirm(confirm)) {
          event.preventDefault();
        }
      }}
      className="flex min-w-0 flex-col gap-2"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} pendingLabel={pendingLabel} className={compact ? 'min-h-9 px-3 text-sm' : ''}>
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
