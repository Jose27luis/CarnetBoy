'use server';

import { settle } from '@/lib/admin-action';
import { type FormState, formInteger, formText } from '@/lib/form-state';
import { apiEmpty } from '@/lib/session';

export async function revokeLinkAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const linkId = formText(formData, 'linkId');
  const result = await apiEmpty(`/v1/admin/links/${encodeURIComponent(linkId)}/revoke`, {
    method: 'POST',
    body: {
      reason: formText(formData, 'reason'),
      document: formText(formData, 'document'),
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, '/admin/vinculos', 'Vínculo revocado. El apoderado ya no ve a este niño.');
}
