'use server';

import type { Facility } from '@carnet/contracts';
import { settle } from '@/lib/admin-action';
import { type FormState, formInteger, formText } from '@/lib/form-state';
import { api } from '@/lib/session';

const PATH = '/admin/establecimientos';

export async function createFacilityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<Facility>('/v1/admin/facilities', {
    method: 'POST',
    body: {
      ipressCode: formText(formData, 'ipressCode'),
      name: formText(formData, 'name'),
      healthNetwork: formText(formData, 'healthNetwork'),
      altitudeMeters: formInteger(formData, 'altitudeMeters'),
    },
  });

  return settle(result, PATH, 'Establecimiento registrado.');
}

export async function updateFacilityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const facilityId = formText(formData, 'facilityId');
  const result = await api<Facility>(`/v1/admin/facilities/${encodeURIComponent(facilityId)}`, {
    method: 'PATCH',
    body: {
      name: formText(formData, 'name'),
      healthNetwork: formText(formData, 'healthNetwork'),
      altitudeMeters: formInteger(formData, 'altitudeMeters'),
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, PATH, 'Cambios guardados.');
}

export async function toggleFacilityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const facilityId = formText(formData, 'facilityId');
  const active = formText(formData, 'active') === 'true';
  const result = await api<Facility>(`/v1/admin/facilities/${encodeURIComponent(facilityId)}`, {
    method: 'PATCH',
    body: { active, expectedVersion: formInteger(formData, 'expectedVersion') },
  });

  return settle(result, PATH, active ? 'Establecimiento activado.' : 'Establecimiento desactivado.');
}
