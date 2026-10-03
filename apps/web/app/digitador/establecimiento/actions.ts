'use server';

import { redirect } from 'next/navigation';
import { writeCookies } from '@/lib/cookie-writer';
import { assignedFacilities, FACILITY_COOKIE } from '@/lib/digitizer-session';
import { isSecureWeb } from '@/lib/env';
import { type FormState, formText } from '@/lib/form-state';

const YEAR_SECONDS = 365 * 24 * 60 * 60;

export async function selectFacilityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const facilityId = formText(formData, 'facilityId');
  const facilities = await assignedFacilities();

  if (!facilities.some((facility) => facility.id === facilityId)) {
    return { status: 'error', message: 'Ese establecimiento ya no está asignado a tu cuenta.', fields: {} };
  }

  await writeCookies([
    {
      name: FACILITY_COOKIE,
      value: facilityId,
      options: { httpOnly: true, secure: isSecureWeb(), sameSite: 'lax', path: '/', maxAge: YEAR_SECONDS },
    },
  ]);
  redirect('/digitador');
}
