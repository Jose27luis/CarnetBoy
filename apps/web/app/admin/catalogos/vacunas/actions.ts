'use server';

import type { Vaccine } from '@carnet/contracts';
import { settle } from '@/lib/admin-action';
import { type FormState, formText } from '@/lib/form-state';
import { api } from '@/lib/session';

const PATH = '/admin/catalogos/vacunas';

export async function createVaccineAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<Vaccine>('/v1/admin/vaccines', {
    method: 'POST',
    body: { code: formText(formData, 'code'), name: formText(formData, 'name'), prevents: formText(formData, 'prevents') },
  });

  return settle(result, PATH, 'Vacuna registrada.');
}

export async function updateVaccineAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const vaccineId = formText(formData, 'vaccineId');
  const result = await api<Vaccine>(`/v1/admin/vaccines/${encodeURIComponent(vaccineId)}`, {
    method: 'PATCH',
    body: { name: formText(formData, 'name'), prevents: formText(formData, 'prevents') },
  });

  return settle(result, PATH, 'Cambios guardados.');
}
