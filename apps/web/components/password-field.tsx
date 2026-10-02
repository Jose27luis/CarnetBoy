'use client';

import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { INPUT_CLASS } from '@/lib/ui';

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  help?: string | undefined;
  error?: string | undefined;
  minLength?: number;
}

export function PasswordField({ label, name, autoComplete, help, error, minLength }: PasswordFieldProps): React.JSX.Element {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-[6px] text-muted transition-colors hover:bg-celeste-50 hover:text-celeste-800"
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
      </div>
      {help ? (
        <p id={helpId} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
