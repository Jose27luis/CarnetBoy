'use client';

import { Search } from 'lucide-react';
import { useId } from 'react';
import { buttonClass, INPUT_CLASS } from '@/lib/ui';

export function SearchForm({ initialDocument, error }: { initialDocument: string; error: string | null }): React.JSX.Element {
  const id = useId();

  return (
    <form method="get" action="/digitador" role="search" className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        DNI o CNV del niño
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="documento"
          defaultValue={initialDocument}
          inputMode="numeric"
          pattern="[0-9]{8,12}"
          maxLength={12}
          required
          autoFocus
          autoComplete="off"
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? undefined : `${id}-error`}
          className={`${INPUT_CLASS} h-12 text-lg tracking-wide sm:flex-1`}
        />
        <button type="submit" className={buttonClass('primary', 'h-12 px-6')}>
          <Search aria-hidden="true" className="size-4" />
          Buscar
        </button>
      </div>
      {error === null ? (
        <p className="text-sm text-muted">8 dígitos para el DNI; de 8 a 12 para el CNV.</p>
      ) : (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
