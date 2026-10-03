import 'server-only';
import type { DigitizerFacility } from '@carnet/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { ApiRequest, ApiResult } from './api-client';
import { api, apiEmpty, loadOrFail } from './session';

export const FACILITY_COOKIE = 'cc_facility';

type DigitizerRequest = Omit<ApiRequest, 'token' | 'clientIp' | 'facilityId'>;

export const assignedFacilities = cache((): Promise<DigitizerFacility[]> => loadOrFail<DigitizerFacility[]>('/v1/digitizer/facilities'));

export const currentFacility = cache(async (): Promise<DigitizerFacility | null> => {
  const facilities = await assignedFacilities();
  const chosen = (await cookies()).get(FACILITY_COOKIE)?.value;
  const match = facilities.find((facility) => facility.id === chosen);

  if (match !== undefined) {
    return match;
  }

  return facilities.length === 1 ? (facilities[0] ?? null) : null;
});

export async function requireFacility(): Promise<DigitizerFacility> {
  const facility = await currentFacility();

  if (facility === null) {
    redirect('/digitador/establecimiento');
  }

  return facility;
}

export async function digitizerApi<T>(path: string, request: DigitizerRequest = {}): Promise<ApiResult<T>> {
  const facility = await requireFacility();

  return api<T>(path, { ...request, facilityId: facility.id });
}

export async function digitizerApiEmpty(path: string, request: DigitizerRequest = {}): Promise<ApiResult<null>> {
  const facility = await requireFacility();

  return apiEmpty(path, { ...request, facilityId: facility.id });
}
