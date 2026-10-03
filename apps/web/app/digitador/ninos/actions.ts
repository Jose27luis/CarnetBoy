'use server';

import type { ChildRecord } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { digitizerApi } from '@/lib/digitizer-session';
import { type FormState, fromApiError, formText, formValues } from '@/lib/form-state';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const BIRTH_TEXT_FIELDS = ['birthPlace', 'deliveryType', 'lengthCm', 'headCircumferenceCm'] as const;
const BIRTH_NUMBER_FIELDS = ['weightGrams', 'apgar1', 'apgar5'] as const;

function optionalText(formData: FormData, name: string): Record<string, string> {
  const value = formText(formData, name);

  return value.length === 0 ? {} : { [name]: value };
}

function optionalNumber(formData: FormData, name: string): Record<string, number> {
  const value = formText(formData, name);

  return value.length === 0 ? {} : { [name]: /^\d+$/.test(value) ? Number(value) : Number.NaN };
}

function childBody(formData: FormData): Record<string, unknown> {
  const birth = {
    ...Object.assign({}, ...BIRTH_TEXT_FIELDS.map((name) => optionalText(formData, name))),
    ...Object.assign({}, ...BIRTH_NUMBER_FIELDS.map((name) => optionalNumber(formData, name))),
  } as Record<string, unknown>;

  return {
    ...optionalText(formData, 'dni'),
    ...optionalText(formData, 'cnv'),
    givenNames: formText(formData, 'givenNames'),
    paternalSurname: formText(formData, 'paternalSurname'),
    maternalSurname: formText(formData, 'maternalSurname'),
    sex: formText(formData, 'sex'),
    birthDate: formText(formData, 'birthDate'),
    ...optionalNumber(formData, 'gestationalWeeks'),
    ...optionalText(formData, 'bloodType'),
    ...(Object.keys(birth).length === 0 ? {} : { birth }),
  };
}

export async function registerChildAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const idempotencyKey = formText(formData, 'idempotencyKey');

  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return { status: 'error', message: 'Recarga la página e inténtalo de nuevo.', fields: {}, values: formValues(formData) };
  }

  const result = await digitizerApi<ChildRecord>('/v1/children', { method: 'POST', idempotencyKey, body: childBody(formData) });

  if (!result.ok) {
    return fromApiError(result.error, formValues(formData));
  }

  redirect(`/digitador/ninos/${result.data.id}`);
}

export async function updateChildAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const childId = formText(formData, 'childId');
  const result = await digitizerApi<ChildRecord>(`/v1/children/${encodeURIComponent(childId)}`, {
    method: 'PATCH',
    body: { ...childBody(formData), expectedVersion: Number(formText(formData, 'expectedVersion')) },
  });

  if (!result.ok) {
    return fromApiError(result.error, formValues(formData));
  }

  revalidatePath(`/digitador/ninos/${childId}`);
  redirect(`/digitador/ninos/${childId}`);
}
