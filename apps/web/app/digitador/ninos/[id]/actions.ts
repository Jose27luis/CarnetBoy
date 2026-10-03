'use server';

import { type ActivationCodeIssued, CONSENT_VERSION, DNI_PATTERN, type Guardian, type LinkCreated } from '@carnet/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { digitizerApi } from '@/lib/digitizer-session';
import { fromApiError, formText, formValues, type FormState } from '@/lib/form-state';

export type LookupState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'found'; dni: string; guardian: Guardian }
  | { status: 'new'; dni: string };

export type LinkState =
  | FormState
  | { status: 'linked'; guardianName: string; active: boolean; activationCode: string | null; codeExpiresAt: string | null };

export type CodeState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'issued'; activationCode: string; codeExpiresAt: string };

function handleUnauthenticated(status: number): void {
  if (status === 401) {
    redirect('/ingresar');
  }
}

export async function lookupGuardianAction(_previous: LookupState, formData: FormData): Promise<LookupState> {
  const dni = formText(formData, 'guardianDni');

  if (!DNI_PATTERN.test(dni)) {
    return { status: 'error', message: 'El DNI del apoderado tiene 8 dígitos.' };
  }

  const result = await digitizerApi<{ guardian: Guardian | null }>(`/v1/guardians/by-dni/${dni}`);

  if (!result.ok) {
    handleUnauthenticated(result.status);
    return { status: 'error', message: result.error.message };
  }

  return result.data.guardian === null ? { status: 'new', dni } : { status: 'found', dni, guardian: result.data.guardian };
}

function optional(formData: FormData, name: string): Record<string, string> {
  const value = formText(formData, name);

  return value.length === 0 ? {} : { [name]: value };
}

export async function createLinkAction(_previous: LinkState, formData: FormData): Promise<LinkState> {
  const childId = formText(formData, 'childId');
  const isNewGuardian = formText(formData, 'isNewGuardian') === 'true';
  const result = await digitizerApi<LinkCreated>(`/v1/children/${encodeURIComponent(childId)}/links`, {
    method: 'POST',
    body: {
      guardianDni: formText(formData, 'guardianDni'),
      relationship: formText(formData, 'relationship'),
      consentAccepted: formData.get('consentAccepted') === 'on',
      consentVersion: CONSENT_VERSION,
      ...(isNewGuardian
        ? {
            guardian: {
              givenNames: formText(formData, 'givenNames'),
              paternalSurname: formText(formData, 'paternalSurname'),
              maternalSurname: formText(formData, 'maternalSurname'),
              ...optional(formData, 'phone'),
              ...optional(formData, 'email'),
            },
          }
        : {}),
    },
  });

  if (!result.ok) {
    handleUnauthenticated(result.status);
    const state = fromApiError(result.error, formValues(formData));

    if (state.status !== 'error') {
      return state;
    }

    return {
      ...state,
      fields: Object.fromEntries(Object.entries(state.fields).map(([field, messages]) => [field.replace(/^guardian\./, ''), messages])),
    };
  }

  revalidatePath(`/digitador/ninos/${childId}`);
  const guardian = result.data.link.guardian;

  return {
    status: 'linked',
    guardianName: `${guardian.givenNames} ${guardian.paternalSurname} ${guardian.maternalSurname}`,
    active: result.data.link.status === 'ACTIVE',
    activationCode: result.data.activationCode,
    codeExpiresAt: result.data.codeExpiresAt,
  };
}

export async function reissueCodeAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const linkId = formText(formData, 'linkId');
  const childId = formText(formData, 'childId');
  const result = await digitizerApi<ActivationCodeIssued>(`/v1/links/${encodeURIComponent(linkId)}/reissue`, { method: 'POST' });

  if (!result.ok) {
    handleUnauthenticated(result.status);
    return { status: 'error', message: result.error.message };
  }

  revalidatePath(`/digitador/ninos/${childId}`);

  return { status: 'issued', ...result.data };
}
