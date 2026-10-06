'use client';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@carnet/contracts';
import { Eye, EyeOff, WandSparkles } from 'lucide-react';
import { useId, useState } from 'react';
import { INPUT_CLASS } from '@/lib/ui';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 16;

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_LENGTH));

  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: 'new-password' | 'current-password';
  help?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  generator?: boolean;
}

export function PasswordField({ label, name, autoComplete, help, error, required = true, generator = false }: PasswordFieldProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const id = useId();
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            name={name}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            required={required}
            minLength={autoComplete === 'new-password' ? PASSWORD_MIN_LENGTH : 1}
            maxLength={PASSWORD_MAX_LENGTH}
            spellCheck={false}
            autoCapitalize="none"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${INPUT_CLASS} pr-12 font-mono`}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            aria-controls={id}
            className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-[8px] text-muted hover:bg-celeste-50 hover:text-celeste-800"
          >
            <Icon aria-hidden="true" className="size-5" />
          </button>
        </div>
        {generator ? (
          <button
            type="button"
            onClick={() => {
              setValue(generatePassword());
              setVisible(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-(--radius-control) border border-line bg-white px-3 text-sm font-semibold hover:border-celeste-500 hover:bg-celeste-50"
          >
            <WandSparkles aria-hidden="true" className="size-4" />
            Generar
          </button>
        ) : null}
      </div>
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }): React.JSX.Element {
  const id = useId();

  return (
    <div className="flex items-start gap-3">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 size-4 accent-celeste-700" />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}
