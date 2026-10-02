import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ApiResult } from './api-client';
import { type FormState, fromApiError, success } from './form-state';

export function settle<T>(result: ApiResult<T>, path: string, message: string, secretOf?: (data: T) => string): FormState {
  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    return fromApiError(result.error);
  }

  revalidatePath(path);

  return success(message, secretOf?.(result.data));
}
