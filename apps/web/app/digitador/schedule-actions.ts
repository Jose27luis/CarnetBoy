'use server';

import type { Appointment } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ApiResult } from '@/lib/api-client';
import { digitizerApi } from '@/lib/digitizer-session';
import { type FormState, fromApiError, formInteger, formText, formValues, success } from '@/lib/form-state';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function settleAppointment(result: ApiResult<Appointment>, formData: FormData, message: string): FormState {
  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    return fromApiError(result.error, formValues(formData));
  }

  revalidatePath(`/digitador/ninos/${result.data.childId}`);
  revalidatePath('/digitador/agenda');

  return success(message);
}

function invalidForm(): FormState {
  return { status: 'error', message: 'Recarga la página e inténtalo de nuevo.', fields: {} };
}

export async function scheduleAppointmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const childId = formText(formData, 'childId');
  const idempotencyKey = formText(formData, 'idempotencyKey');

  if (!UUID_PATTERN.test(childId) || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return invalidForm();
  }

  const scheduledOn = formText(formData, 'scheduledOn');
  const suggestedOn = formText(formData, 'suggestedOn');
  const note = formText(formData, 'note');
  const result = await digitizerApi<Appointment>(`/v1/children/${childId}/appointments`, {
    method: 'POST',
    idempotencyKey,
    body: {
      type: formText(formData, 'type'),
      scheduledOn,
      origin: suggestedOn.length > 0 && suggestedOn === scheduledOn ? 'SYSTEM' : 'DIGITIZER',
      ...(note.length === 0 ? {} : { note }),
    },
  });

  return settleAppointment(result, formData, 'Cita programada.');
}

export async function rescheduleAppointmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const appointmentId = formText(formData, 'appointmentId');

  if (!UUID_PATTERN.test(appointmentId)) {
    return invalidForm();
  }

  const result = await digitizerApi<Appointment>(`/v1/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: { scheduledOn: formText(formData, 'scheduledOn'), expectedVersion: formInteger(formData, 'expectedVersion') },
  });

  return settleAppointment(result, formData, 'Cita reprogramada.');
}

const CLOSING_MESSAGES: Record<string, string> = {
  ATTENDED: 'Cita marcada como atendida.',
  MISSED: 'Cita marcada como perdida.',
  CANCELLED: 'Cita cancelada.',
};

export async function closeAppointmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const appointmentId = formText(formData, 'appointmentId');
  const status = formText(formData, 'status');
  const message = CLOSING_MESSAGES[status];

  if (!UUID_PATTERN.test(appointmentId) || message === undefined) {
    return invalidForm();
  }

  const reason = formText(formData, 'reason');
  const result = await digitizerApi<Appointment>(`/v1/appointments/${appointmentId}/close`, {
    method: 'POST',
    body: { status, expectedVersion: formInteger(formData, 'expectedVersion'), ...(reason.length === 0 ? {} : { reason }) },
  });

  return settleAppointment(result, formData, message);
}
