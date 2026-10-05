'use server';

import { settle } from '@/lib/admin-action';
import { type FormState, formText } from '@/lib/form-state';
import { apiEmpty } from '@/lib/session';

const CORRECTIONS_PATH = '/admin/correcciones';

export async function approveCorrectionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const correctionId = encodeURIComponent(formText(formData, 'correctionId'));
  const result = await apiEmpty(`/v1/admin/corrections/${correctionId}/approve`, { method: 'POST' });

  return settle(result, CORRECTIONS_PATH, 'Corrección aprobada. El registro nuevo ya está vigente.');
}

export async function rejectCorrectionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const correctionId = encodeURIComponent(formText(formData, 'correctionId'));
  const result = await apiEmpty(`/v1/admin/corrections/${correctionId}/reject`, { method: 'POST', body: { reason: formText(formData, 'reason') } });

  return settle(result, CORRECTIONS_PATH, 'Corrección rechazada. El registro original sigue vigente.');
}
