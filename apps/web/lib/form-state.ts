import type { ApiErrorBody } from '@carnet/contracts';

export type FormState =
  | { status: 'idle' }
  | { status: 'success'; message: string; secret?: string }
  | { status: 'error'; message: string; fields: Record<string, string[]>; values?: Record<string, string> };

export const IDLE: FormState = { status: 'idle' };

export function fromApiError(error: ApiErrorBody, values?: Record<string, string>): FormState {
  const fields = Object.fromEntries(Object.entries(error.fields ?? {}).map(([field, messages]) => [field.replace(/^birth\./, ''), messages]));

  return values === undefined
    ? { status: 'error', message: error.message, fields }
    : { status: 'error', message: error.message, fields, values };
}

export function success(message: string, secret?: string): FormState {
  return secret === undefined ? { status: 'success', message } : { status: 'success', message, secret };
}

export function fieldError(state: FormState, field: string): string | undefined {
  return state.status === 'error' ? state.fields[field]?.[0] : undefined;
}

export function submittedValue(state: FormState, field: string, fallback: string | undefined): string | undefined {
  return state.status === 'error' && state.values !== undefined ? state.values[field] : fallback;
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

export function formInteger(formData: FormData, name: string): number {
  const text = formText(formData, name);

  return /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
}

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [name, value] of formData.entries()) {
    if (typeof value === 'string' && !name.startsWith('$')) {
      values[name] = value;
    }
  }

  return values;
}
