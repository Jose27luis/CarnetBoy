'use server';

import type { FacilityAssignmentItem, StaffAccount, StaffAccountCreated, TemporaryPasswordIssued } from '@carnet/contracts';
import { settle } from '@/lib/admin-action';
import { type FormState, formText } from '@/lib/form-state';
import { api, apiEmpty } from '@/lib/session';

const PATH = '/admin/cuentas';
const ACCOUNT_COMMANDS = {
  suspend: 'La cuenta quedó desactivada y se cerraron sus sesiones.',
  reactivate: 'La cuenta está activa otra vez.',
  'totp-reset': 'Se borró el segundo factor. La persona lo configurará en su siguiente ingreso.',
} as const;

type AccountCommand = keyof typeof ACCOUNT_COMMANDS;

function isAccountCommand(value: string): value is AccountCommand {
  return value in ACCOUNT_COMMANDS;
}

function accountValues(formData: FormData): Record<string, string> {
  return { fullName: formText(formData, 'fullName'), email: formText(formData, 'email'), role: formText(formData, 'role') };
}

function rawText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
}

export async function createAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = rawText(formData, 'password');
  const values = accountValues(formData);
  const result = await api<StaffAccountCreated>('/v1/admin/accounts', {
    method: 'POST',
    body: { ...values, ...(password.length === 0 ? {} : { password, requirePasswordChange: formData.get('requirePasswordChange') === 'on' }) },
  });

  if (result.ok && result.data.temporaryPassword === null) {
    return settle(result, PATH, `Cuenta creada para ${result.data.account.email} con la contraseña que definiste.`);
  }

  return settle(
    result,
    PATH,
    'Cuenta creada. Entrega esta contraseña temporal a la persona; solo se muestra ahora y la cambiará al ingresar.',
    { secretOf: (data) => data.temporaryPassword ?? '', values },
  );
}

export async function updateAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const accountId = encodeURIComponent(formText(formData, 'accountId'));
  const values = accountValues(formData);
  const result = await api<StaffAccount>(`/v1/admin/accounts/${accountId}`, { method: 'PATCH', body: values });

  return settle(result, PATH, 'Datos guardados.', { values });
}

export async function setPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const accountId = encodeURIComponent(formText(formData, 'accountId'));
  const result = await api<StaffAccount>(`/v1/admin/accounts/${accountId}/password`, {
    method: 'POST',
    body: { password: rawText(formData, 'password'), requirePasswordChange: formData.get('requirePasswordChange') === 'on' },
  });

  return settle(result, PATH, 'Contraseña actualizada. Se cerraron sus sesiones abiertas.');
}

export async function changeOwnPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await apiEmpty('/v1/account/password', {
    method: 'POST',
    body: { currentPassword: rawText(formData, 'currentPassword'), newPassword: rawText(formData, 'newPassword') },
  });

  return settle(result, PATH, 'Tu contraseña cambió.');
}

export async function accountCommandAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const command = formText(formData, 'command');
  const accountId = formText(formData, 'accountId');

  if (!isAccountCommand(command)) {
    return { status: 'error', message: 'Acción desconocida.', fields: {} };
  }

  const result = await api<StaffAccount>(`/v1/admin/accounts/${encodeURIComponent(accountId)}/${command}`, { method: 'POST' });

  return settle(result, PATH, ACCOUNT_COMMANDS[command]);
}

export async function resetPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const accountId = formText(formData, 'accountId');
  const result = await api<TemporaryPasswordIssued>(`/v1/admin/accounts/${encodeURIComponent(accountId)}/password-reset`, {
    method: 'POST',
  });

  return settle(result, PATH, 'Contraseña temporal nueva. Solo se muestra ahora:', { secretOf: (data) => data.temporaryPassword });
}

export async function assignFacilityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const facilityId = formText(formData, 'facilityId');
  const result = await api<FacilityAssignmentItem>(`/v1/admin/facilities/${encodeURIComponent(facilityId)}/assignments`, {
    method: 'POST',
    body: { accountId: formText(formData, 'accountId') },
  });

  return settle(result, PATH, 'Establecimiento asignado.');
}

export async function endAssignmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const facilityId = encodeURIComponent(formText(formData, 'facilityId'));
  const accountId = encodeURIComponent(formText(formData, 'accountId'));
  const result = await apiEmpty(`/v1/admin/facilities/${facilityId}/assignments/${accountId}/end`, { method: 'POST' });

  return settle(result, PATH, 'Asignación terminada.');
}
