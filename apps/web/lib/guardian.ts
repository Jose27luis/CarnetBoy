import 'server-only';
import type { GuardianCarnet, GuardianChildCard } from '@carnet/contracts';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { api } from './session';

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export const loadChildCards = cache(async (): Promise<GuardianChildCard[]> => {
  const result = await api<GuardianChildCard[]>('/v1/me/carnet');

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  return result.data;
});

export const loadCarnet = cache(async (childId: string): Promise<GuardianCarnet> => {
  if (!UUID_PATTERN.test(childId)) {
    notFound();
  }

  const result = await api<GuardianCarnet>(`/v1/me/carnet/${childId}`);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    if (result.status === 404) {
      notFound();
    }

    throw new Error(result.error.message);
  }

  return result.data;
});
