'use client';

import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';

const FRAME_CLASS =
  'group relative rounded-(--radius-control) border bg-white transition-[border-color,box-shadow] duration-150 has-[input:focus]:border-celeste-500 has-[input:focus]:shadow-[0_0_0_4px_var(--color-celeste-100)]';

const LABEL_BASE_CLASS =
  'pointer-events-none absolute left-4 -translate-y-1/2 text-muted transition-all duration-150 ease-out group-has-[input:focus]:text-celeste-700';

const LABEL_RESTING_CLASS =
  'top-1/2 text-base group-has-[input:focus]:top-3.5 group-has-[input:focus]:text-xs group-has-[input:focus]:font-semibold ' +
  'group-has-[input:autofill]:top-3.5 group-has-[input:autofill]:text-xs group-has-[input:autofill]:font-semibold';

const LABEL_FLOATED_CLASS = 'top-3.5 text-xs font-semibold';

const INPUT_CLASS =
  'block h-14 w-full rounded-(--radius-control) bg-transparent px-4 pb-2 pt-6 text-base text-ink outline-none autofill:shadow-[inset_0_0_0_40px_white]';

interface FloatingFrameProps {
  label: string;
  filled: boolean;
  help?: string | undefined;
  error?: string | undefined;
  trailing?: (inputId: string) => React.ReactNode;
  children: (ids: { id: string; describedBy: string | undefined }) => React.ReactNode;
}

function FloatingFrame({ label, filled, help, error, trailing, children }: FloatingFrameProps): React.JSX.Element {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className={`${FRAME_CLASS} ${error ? 'border-danger' : 'border-line'}`}>
        {children({ id, describedBy })}
        <label htmlFor={id} className={`${LABEL_BASE_CLASS} ${filled ? LABEL_FLOATED_CLASS : LABEL_RESTING_CLASS}`}>
          {label}
        </label>
        {trailing?.(id)}
      </div>
      {help ? (
        <p id={helpId} className="px-1 text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="px-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface FloatingInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email';
  inputMode?: 'text' | 'email' | 'numeric';
  autoComplete?: string;
  help?: string | undefined;
  error?: string | undefined;
  maxLength?: number;
  pattern?: string;
}

export function FloatingInput({
  label,
  name,
  type = 'text',
  inputMode,
  autoComplete = 'off',
  help,
  error,
  maxLength,
  pattern,
}: FloatingInputProps): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <FloatingFrame label={label} help={help} error={error} filled={value.length > 0}>
      {({ id, describedBy }) => (
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={INPUT_CLASS}
        />
      )}
    </FloatingFrame>
  );
}

interface FloatingPasswordProps {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  help?: string | undefined;
  error?: string | undefined;
  minLength?: number;
}

export function FloatingPassword({ label, name, autoComplete, help, error, minLength }: FloatingPasswordProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const Icon = visible ? EyeOff : Eye;

  return (
    <FloatingFrame
      label={label}
      help={help}
      error={error}
      filled={value.length > 0}
      trailing={(inputId) => (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={inputId}
          className="absolute inset-y-2 right-2 grid w-11 place-items-center rounded-[8px] text-muted transition-colors hover:bg-celeste-50 hover:text-celeste-800"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={visible ? 'hide' : 'show'}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="grid place-items-center"
            >
              <Icon aria-hidden="true" className="size-5" />
            </motion.span>
          </AnimatePresence>
        </button>
      )}
    >
      {({ id, describedBy }) => (
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          spellCheck={false}
          autoCapitalize="none"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} pr-14`}
        />
      )}
    </FloatingFrame>
  );
}
