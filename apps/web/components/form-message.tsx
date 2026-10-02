'use client';

import { CircleAlert, CircleCheck, Copy } from 'lucide-react';
import { useState } from 'react';
import type { FormState } from '@/lib/form-state';
import { buttonClass } from '@/lib/ui';

function SecretValue({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <code className="select-all rounded-(--radius-control) border border-ok/30 bg-white px-3 py-1.5 font-mono text-base tracking-wide text-ink">
        {value}
      </code>
      <button type="button" onClick={() => void copy()} className={buttonClass('ghost', 'min-h-9 px-3 text-sm')}>
        <Copy aria-hidden="true" className="size-4" />
        {copied ? 'Copiada' : 'Copiar'}
      </button>
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }): React.JSX.Element | null {
  if (state.status === 'idle') {
    return null;
  }

  if (state.status === 'error') {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-(--radius-control) border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <div role="status" className="rounded-(--radius-control) border border-ok/30 bg-ok/5 px-3 py-2 text-sm text-ok">
      <p className="flex items-start gap-2">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {state.message}
      </p>
      {state.secret === undefined ? null : <SecretValue value={state.secret} />}
    </div>
  );
}
