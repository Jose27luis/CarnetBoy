'use server';

import { type LoginStep, PASSWORD_MIN_LENGTH, TOTP_CODE_PATTERN } from '@carnet/contracts';
import { redirect } from 'next/navigation';
import { requestJson } from '@/lib/api-client';
import { type FormState, fromApiError, formText } from '@/lib/form-state';
import { abandonChallenge, continueLogin, pendingChallenge } from '@/lib/login-flow';
import { currentClientIp } from '@/lib/session';

const RESTART_CODES = new Set(['LOGIN_CHALLENGE_INVALID', 'ACCOUNT_LOCKED', 'ACCOUNT_SUSPENDED']);

async function restartIfNeeded(code: string): Promise<void> {
  if (RESTART_CODES.has(code)) {
    await abandonChallenge();
  }
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await requestJson<LoginStep>('/v1/auth/login', {
    method: 'POST',
    body: { email: formText(formData, 'email'), password: formData.get('password') ?? '' },
    clientIp: await currentClientIp(),
  });

  if (!result.ok) {
    return fromApiError(result.error);
  }

  return continueLogin(result.data, formText(formData, 'next'));
}

export async function initialPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const challenge = await pendingChallenge(['PASSWORD_CHANGE_REQUIRED']);
  const newPassword = formData.get('newPassword');
  const confirmation = formData.get('confirmation');

  if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN_LENGTH) {
    return {
      status: 'error',
      message: 'Revisa la nueva contraseña.',
      fields: { newPassword: [`Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`] },
    };
  }

  if (newPassword !== confirmation) {
    return { status: 'error', message: 'Las contraseñas no coinciden.', fields: { confirmation: ['Escribe la misma contraseña.'] } };
  }

  const result = await requestJson<LoginStep>('/v1/auth/password/initial', {
    method: 'POST',
    body: { challengeToken: challenge.challengeToken, newPassword },
    clientIp: await currentClientIp(),
  });

  if (!result.ok) {
    await restartIfNeeded(result.error.code);
    return fromApiError(result.error);
  }

  return continueLogin(result.data);
}

export async function verifyTotpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const challenge = await pendingChallenge(['TOTP_REQUIRED', 'TOTP_ENROLLMENT_REQUIRED']);
  const code = formText(formData, 'code').replaceAll(' ', '');

  if (!TOTP_CODE_PATTERN.test(code)) {
    return { status: 'error', message: 'Revisa el código.', fields: { code: ['El código tiene 6 dígitos.'] } };
  }

  const result = await requestJson<LoginStep>('/v1/auth/totp/verify', {
    method: 'POST',
    body: { challengeToken: challenge.challengeToken, code },
    clientIp: await currentClientIp(),
  });

  if (!result.ok) {
    await restartIfNeeded(result.error.code);
    return fromApiError(result.error);
  }

  return continueLogin(result.data);
}

export async function cancelLoginAction(): Promise<void> {
  await abandonChallenge();
  redirect('/ingresar');
}
