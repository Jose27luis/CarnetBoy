import type { ApiErrorBody } from '@carnet/contracts';

export type FormState =
  | { status: 'idle' }
  | { status: 'success'; message: string; secret?: string }
  | { status: 'error'; message: string; fields: Record<string, string[]> };

export const IDLE: FormState = { status: 'idle' };

export function fromApiError(error: ApiErrorBody): FormState {
  return { status: 'error', message: error.message, fields: error.fields ?? {} };
}

export function success(message: string, secret?: string): FormState {
  return secret === undefined ? { status: 'success', message } : { status: 'success', message, secret };
}

export function fieldError(state: FormState, field: string): string | undefined {
  return state.status === 'error' ? state.fields[field]?.[0] : undefined;
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

export function formInteger(formData: FormData, name: string): number {
  const text = formText(formData, name);

  return /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
}
