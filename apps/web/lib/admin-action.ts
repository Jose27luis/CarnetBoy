import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ApiResult } from './api-client';
import { type FormState, fromApiError, success } from './form-state';

interface SettleOptions<T> {
  secretOf?: (data: T) => string;
  values?: Record<string, string>;
}

export function settle<T>(result: ApiResult<T>, path: string, message: string, options: SettleOptions<T> = {}): FormState {
  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    return fromApiError(result.error, options.values);
  }

  revalidatePath(path);

  return success(message, options.secretOf?.(result.data));
}
