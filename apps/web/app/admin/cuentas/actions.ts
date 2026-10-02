'use server';

import type { FacilityAssignmentItem, StaffAccount, StaffAccountCreated, TemporaryPasswordIssued } from '@carnet/contracts';
import { settle } from '@/lib/admin-action';
import { type FormState, formText } from '@/lib/form-state';
import { api, apiEmpty } from '@/lib/session';

const PATH = '/admin/cuentas';
const ACCOUNT_COMMANDS = {
  suspend: 'La cuenta quedó suspendida y se cerraron sus sesiones.',
  reactivate: 'La cuenta está activa otra vez.',
  'totp-reset': 'Se borró el segundo factor. La persona lo configurará en su siguiente ingreso.',
} as const;

type AccountCommand = keyof typeof ACCOUNT_COMMANDS;

function isAccountCommand(value: string): value is AccountCommand {
  return value in ACCOUNT_COMMANDS;
}

export async function createAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await api<StaffAccountCreated>('/v1/admin/accounts', {
    method: 'POST',
    body: { email: formText(formData, 'email'), fullName: formText(formData, 'fullName'), role: formText(formData, 'role') },
  });

  return settle(
    result,
    PATH,
    'Cuenta creada. Entrega esta contraseña temporal a la persona; solo se muestra ahora y la cambiará al ingresar.',
    (data) => data.temporaryPassword,
  );
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

  return settle(result, PATH, 'Contraseña temporal nueva. Solo se muestra ahora:', (data) => data.temporaryPassword);
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
