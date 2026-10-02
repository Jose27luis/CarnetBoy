'use server';

import type { CatalogVersionDetail } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { settle } from '@/lib/admin-action';
import { type FormState, fromApiError, formInteger, formText } from '@/lib/form-state';
import { catalogSectionBySlug } from '@/lib/labels';
import { api } from '@/lib/session';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

function versionPath(formData: FormData): string {
  return `/admin/catalogos/${encodeURIComponent(formText(formData, 'slug'))}/${encodeURIComponent(formText(formData, 'versionId'))}`;
}

function versionEndpoint(formData: FormData, suffix = ''): string {
  return `/v1/admin/catalogs/${encodeURIComponent(formText(formData, 'versionId'))}${suffix}`;
}

export async function createDraftAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const section = catalogSectionBySlug(formText(formData, 'slug'));
  const idempotencyKey = formText(formData, 'idempotencyKey');
  const copyFromId = formText(formData, 'copyFromId');

  if (section === undefined || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return { status: 'error', message: 'Recarga la página e inténtalo de nuevo.', fields: {} };
  }

  const result = await api<CatalogVersionDetail>('/v1/admin/catalogs', {
    method: 'POST',
    idempotencyKey,
    body: { kind: section.kind, norm: formText(formData, 'norm'), ...(copyFromId.length > 0 ? { copyFromId } : {}) },
  });

  if (!result.ok) {
    return fromApiError(result.error);
  }

  revalidatePath(`/admin/catalogos/${section.slug}`);
  redirect(`/admin/catalogos/${section.slug}/${result.data.id}`);
}

export async function updateNormAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData), {
    method: 'PATCH',
    body: { norm: formText(formData, 'norm'), expectedVersion: formInteger(formData, 'expectedVersion') },
  });

  return settle(result, versionPath(formData), 'Norma actualizada.');
}

export async function addDoseAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData, '/doses'), {
    method: 'POST',
    body: {
      vaccineId: formText(formData, 'vaccineId'),
      doseNumber: formInteger(formData, 'doseNumber'),
      recommendedAgeDays: formInteger(formData, 'recommendedAgeDays'),
      maxAgeDays: formInteger(formData, 'maxAgeDays'),
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, versionPath(formData), 'Dosis agregada.');
}

export async function addThresholdAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData, '/hemoglobin-thresholds'), {
    method: 'POST',
    body: {
      minAgeMonths: formInteger(formData, 'minAgeMonths'),
      maxAgeMonths: formInteger(formData, 'maxAgeMonths'),
      normalFrom: formText(formData, 'normalFrom'),
      mildFrom: formText(formData, 'mildFrom'),
      moderateFrom: formText(formData, 'moderateFrom'),
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, versionPath(formData), 'Umbral agregado.');
}

export async function addIntervalAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData, '/appointment-intervals'), {
    method: 'POST',
    body: {
      appointmentType: formText(formData, 'appointmentType'),
      minAgeMonths: formInteger(formData, 'minAgeMonths'),
      maxAgeMonths: formInteger(formData, 'maxAgeMonths'),
      intervalDays: formInteger(formData, 'intervalDays'),
      expectedVersion: formInteger(formData, 'expectedVersion'),
    },
  });

  return settle(result, versionPath(formData), 'Intervalo agregado.');
}

export async function removeEntryAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const entryId = encodeURIComponent(formText(formData, 'entryId'));
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData, `/entries/${entryId}/remove`), {
    method: 'POST',
    body: { expectedVersion: formInteger(formData, 'expectedVersion') },
  });

  return settle(result, versionPath(formData), 'Entrada quitada.');
}

export async function publishAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<CatalogVersionDetail>(versionEndpoint(formData, '/publish'), {
    method: 'POST',
    body: { validFrom: formText(formData, 'validFrom'), expectedVersion: formInteger(formData, 'expectedVersion') },
  });

  if (result.ok) {
    revalidatePath(`/admin/catalogos/${encodeURIComponent(formText(formData, 'slug'))}`);
  }

  return settle(result, versionPath(formData), 'Versión publicada. Desde la fecha indicada reemplaza a la anterior.');
}
