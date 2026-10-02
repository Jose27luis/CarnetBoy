import { useId } from 'react';
import { INPUT_CLASS } from '@/lib/ui';

interface FieldFrameProps {
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  children: (ids: { id: string; describedBy: string | undefined }) => React.ReactNode;
}

function FieldFrame({ label, help, error, children }: FieldFrameProps): React.JSX.Element {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy })}
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

interface FormFieldProps {
  label: string;
  name: string;
  help?: string | undefined;
  error?: string | undefined;
  defaultValue?: string | number | undefined;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email';
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: string;
  pattern?: string;
  required?: boolean;
  autoComplete?: string;
}

export function FormField({
  label,
  name,
  help,
  error,
  defaultValue,
  type = 'text',
  inputMode,
  maxLength,
  minLength,
  min,
  max,
  step,
  pattern,
  required = true,
  autoComplete = 'off',
}: FormFieldProps): React.JSX.Element {
  return (
    <FieldFrame label={label} help={help} error={error}>
      {({ id, describedBy }) => (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={defaultValue}
          inputMode={inputMode}
          maxLength={maxLength}
          minLength={minLength}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={INPUT_CLASS}
        />
      )}
    </FieldFrame>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  help?: string | undefined;
  error?: string | undefined;
  defaultValue?: string | undefined;
  required?: boolean;
}

export function SelectField({ label, name, options, help, error, defaultValue, required = true }: SelectFieldProps): React.JSX.Element {
  return (
    <FieldFrame label={label} help={help} error={error}>
      {({ id, describedBy }) => (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue ?? ''}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            Elige una opción
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}
