'use server';

import type { NotificationSettings, PushSubscriptionInput } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type FormState, fromApiError, formText, success } from '@/lib/form-state';
import { api, apiEmpty } from '@/lib/session';

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_BASE64_LENGTH = 960_000;

export type ActionResult = { ok: true } | { ok: false; message: string };

function failure(status: number, message: string): ActionResult {
  if (status === 401) {
    redirect('/ingresar');
  }

  return { ok: false, message };
}

export async function savePhotoAction(childId: string, image: string): Promise<ActionResult> {
  if (!UUID_PATTERN.test(childId) || image.length > MAX_BASE64_LENGTH || !BASE64_PATTERN.test(image)) {
    return { ok: false, message: 'La foto no es válida. Prueba con otra imagen.' };
  }

  const result = await apiEmpty(`/v1/me/carnet/${childId}/photo`, { method: 'PUT', body: { image } });

  if (!result.ok) {
    return failure(result.status, result.error.fields?.photo?.[0] ?? result.error.message);
  }

  revalidatePath('/carnet', 'layout');

  return { ok: true };
}

export async function removePhotoAction(childId: string): Promise<ActionResult> {
  if (!UUID_PATTERN.test(childId)) {
    return { ok: false, message: 'Recarga la página e inténtalo de nuevo.' };
  }

  const result = await apiEmpty(`/v1/me/carnet/${childId}/photo/remove`, { method: 'POST' });

  if (!result.ok) {
    return failure(result.status, result.error.message);
  }

  revalidatePath('/carnet', 'layout');

  return { ok: true };
}

export async function updateNotificationsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = formText(formData, 'email');
  const result = await api<NotificationSettings>('/v1/me/notifications', {
    method: 'PUT',
    body: { emailEnabled: formData.get('emailEnabled') === 'on', pushEnabled: formData.get('pushEnabled') === 'on', email: email.length === 0 ? null : email },
  });

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    return fromApiError(result.error, { email });
  }

  revalidatePath('/carnet/avisos');

  return success('Preferencias guardadas.');
}

export async function savePushSubscriptionAction(subscription: PushSubscriptionInput): Promise<ActionResult> {
  const result = await apiEmpty('/v1/me/push-subscriptions', { method: 'POST', body: subscription });

  if (!result.ok) {
    return failure(result.status, result.error.message);
  }

  revalidatePath('/carnet/avisos');

  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  const result = await apiEmpty('/v1/me/push-subscriptions/remove', { method: 'POST', body: { endpoint } });

  if (!result.ok) {
    return failure(result.status, result.error.message);
  }

  revalidatePath('/carnet/avisos');

  return { ok: true };
}
