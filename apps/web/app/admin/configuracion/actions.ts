'use server';

import type { SecuritySettings } from '@carnet/contracts';
import { settle } from '@/lib/admin-action';
import { type FormState, formInteger } from '@/lib/form-state';
import { api } from '@/lib/session';

export async function updateSecurityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<SecuritySettings>('/v1/admin/settings/security', {
    method: 'PUT',
    body: {
      totpRequired: formData.get('totpRequired') === 'on',
      staffPasswordChange: formData.get('staffPasswordChange') === 'on',
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, '/admin/configuracion', 'Configuración guardada. Rige desde el siguiente ingreso de cada persona.');
}
