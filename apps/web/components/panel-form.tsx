'use client';

import { useActionState, useCallback, useId, useState } from 'react';
import { type FormState, IDLE } from '@/lib/form-state';
import { buttonClass, INPUT_CLASS } from '@/lib/ui';
import { FormMessage } from './form-message';
import { SidePanel } from './side-panel';
import { SubmitButton } from './submit-button';

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

interface PanelFormProps {
  trigger: React.ReactNode;
  triggerClassName: string;
  title: string;
  description?: string;
  action: Action;
  hidden: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
  submitVariant?: 'primary' | 'danger';
  closeOnSuccess?: boolean;
  children: (state: FormState) => React.ReactNode;
}

type BodyProps = Omit<PanelFormProps, 'trigger' | 'triggerClassName' | 'title' | 'description'> & { onDone: () => void };

function PanelFormBody({ action, hidden, submitLabel, pendingLabel, submitVariant = 'primary', closeOnSuccess, onDone, children }: BodyProps): React.JSX.Element {
  const [idempotencyKey] = useState(() => crypto.randomUUID().replaceAll('-', ''));
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const next = await action(previous, formData);

    if (next.status === 'success' && closeOnSuccess === true) {
      onDone();
    }

    return next;
  }, IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === 'success' ? null : children(state)}
      <FormMessage state={state} />
      {state.status === 'success' ? (
        <button type="button" onClick={onDone} className={buttonClass('secondary')}>
          Cerrar
        </button>
      ) : (
        <SubmitButton pendingLabel={pendingLabel} variant={submitVariant}>
          {submitLabel}
        </SubmitButton>
      )}
    </form>
  );
}

export function PanelForm({ trigger, triggerClassName, title, description, closeOnSuccess = true, ...body }: PanelFormProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
      <SidePanel open={open} title={title} {...(description === undefined ? {} : { description })} onClose={close}>
        {open ? <PanelFormBody {...body} closeOnSuccess={closeOnSuccess} onDone={close} /> : null}
      </SidePanel>
    </>
  );
}

interface TextAreaFieldProps {
  label: string;
  name: string;
  error?: string | undefined;
  defaultValue?: string | undefined;
  help?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export function TextAreaField({ label, name, error, defaultValue, help, required = true, minLength = 5, maxLength = 300 }: TextAreaFieldProps): React.JSX.Element {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        minLength={required ? minLength : undefined}
        maxLength={maxLength}
        rows={3}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className={`${INPUT_CLASS} py-2`}
      />
      {help === undefined ? null : <p className="text-sm text-muted">{help}</p>}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
