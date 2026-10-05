'use server';

import { CLINICAL_RECORD_TYPES, type ClinicalRecordType, type CorrectionOutcome } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ApiResult } from '@/lib/api-client';
import { digitizerApi } from '@/lib/digitizer-session';
import { type FormState, fromApiError, formInteger, formText, formValues, success } from '@/lib/form-state';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

const ERROR_FIELD: Partial<Record<string, string>> = {
  DOSE_OUT_OF_RANGE: 'outOfRangeReason',
  MEASUREMENT_NEEDS_CONFIRMATION: 'confirmed',
};

function childPath(childId: string): string {
  return `/digitador/ninos/${childId}`;
}

function settleRecord<T>(result: ApiResult<T>, formData: FormData, childId: string, message: string): FormState {
  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    const state = fromApiError(result.error, formValues(formData));
    const field = ERROR_FIELD[result.error.code];

    return field === undefined || state.status !== 'error' ? state : { ...state, fields: { ...state.fields, [field]: [result.error.message] } };
  }

  revalidatePath(childPath(childId));

  return success(message);
}

function optional(formData: FormData, name: string): Record<string, string> {
  const value = formText(formData, name);

  return value.length === 0 ? {} : { [name]: value };
}

function invalidForm(): FormState {
  return { status: 'error', message: 'Recarga la página e inténtalo de nuevo.', fields: {} };
}

function requestTarget(formData: FormData): { childId: string; idempotencyKey: string } | null {
  const childId = formText(formData, 'childId');
  const idempotencyKey = formText(formData, 'idempotencyKey');

  return UUID_PATTERN.test(childId) && IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey) ? { childId, idempotencyKey } : null;
}

function doseFields(formData: FormData): Record<string, string> {
  return { administeredOn: formText(formData, 'administeredOn'), lot: formText(formData, 'lot'), ...optional(formData, 'outOfRangeReason') };
}

function growthFields(formData: FormData): Record<string, string | boolean> {
  return {
    measuredOn: formText(formData, 'measuredOn'),
    weightKg: formText(formData, 'weightKg'),
    lengthCm: formText(formData, 'lengthCm'),
    position: formText(formData, 'position'),
    ...optional(formData, 'headCircumferenceCm'),
    ...(formData.get('confirmed') === 'on' ? { confirmed: true } : {}),
  };
}

function hemoglobinFields(formData: FormData): Record<string, string> {
  return { testedOn: formText(formData, 'testedOn'), observed: formText(formData, 'observed') };
}

function ironFields(formData: FormData): Record<string, string | number> {
  return {
    suppliedOn: formText(formData, 'suppliedOn'),
    product: formText(formData, 'product'),
    doseInstructions: formText(formData, 'doseInstructions'),
    quantity: formInteger(formData, 'quantity'),
    purpose: formText(formData, 'purpose'),
  };
}

export async function recordDoseAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const target = requestTarget(formData);

  if (target === null) {
    return invalidForm();
  }

  const result = await digitizerApi(`/v1/children/${target.childId}/doses`, {
    method: 'POST',
    idempotencyKey: target.idempotencyKey,
    body: { scheduledDoseId: formText(formData, 'scheduledDoseId'), ...doseFields(formData) },
  });

  return settleRecord(result, formData, target.childId, 'Vacuna registrada.');
}

export async function recordGrowthAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const target = requestTarget(formData);

  if (target === null) {
    return invalidForm();
  }

  const result = await digitizerApi(`/v1/children/${target.childId}/growth-checks`, {
    method: 'POST',
    idempotencyKey: target.idempotencyKey,
    body: growthFields(formData),
  });

  return settleRecord(result, formData, target.childId, 'Control registrado.');
}

export async function recordHemoglobinAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const target = requestTarget(formData);

  if (target === null) {
    return invalidForm();
  }

  const result = await digitizerApi(`/v1/children/${target.childId}/hemoglobin-tests`, {
    method: 'POST',
    idempotencyKey: target.idempotencyKey,
    body: hemoglobinFields(formData),
  });

  return settleRecord(result, formData, target.childId, 'Dosaje registrado.');
}

export async function recordIronAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const target = requestTarget(formData);

  if (target === null) {
    return invalidForm();
  }

  const result = await digitizerApi(`/v1/children/${target.childId}/iron-supplies`, {
    method: 'POST',
    idempotencyKey: target.idempotencyKey,
    body: ironFields(formData),
  });

  return settleRecord(result, formData, target.childId, 'Entrega registrada.');
}

const FIELDS_BY_TYPE: Record<ClinicalRecordType, (formData: FormData) => Record<string, string | number | boolean>> = {
  DOSE: doseFields,
  GROWTH_CHECK: (formData) => ({ ...growthFields(formData), confirmed: true }),
  HEMOGLOBIN_TEST: hemoglobinFields,
  IRON_SUPPLY: ironFields,
};

function isRecordType(value: string): value is ClinicalRecordType {
  return CLINICAL_RECORD_TYPES.some((type) => type === value);
}

export async function requestCorrectionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const childId = formText(formData, 'childId');
  const recordId = formText(formData, 'recordId');
  const recordType = formText(formData, 'recordType');

  if (!UUID_PATTERN.test(childId) || !UUID_PATTERN.test(recordId) || !isRecordType(recordType)) {
    return invalidForm();
  }

  const result = await digitizerApi<CorrectionOutcome>(`/v1/records/${recordType}/${recordId}/corrections`, {
    method: 'POST',
    body: { fields: FIELDS_BY_TYPE[recordType](formData), reason: formText(formData, 'reason') },
  });

  if (!result.ok) {
    return settleRecord(result, formData, childId, '');
  }

  revalidatePath(childPath(childId));

  return success(result.data.applied ? 'Corrección aplicada. La versión anterior queda en el historial.' : 'Corrección enviada. El administrador debe aprobarla.');
}
