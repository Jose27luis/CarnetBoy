'use server';

import { type ActivationChallenge, DNI_PATTERN, GUARDIAN_PASSWORD_MIN_LENGTH, type LoginStep } from '@carnet/contracts';
import { redirect } from 'next/navigation';
import { activationCookie, clearedActivationCookie, pendingActivation } from '@/lib/activation-cookie';
import { requestJson } from '@/lib/api-client';
import { writeCookies } from '@/lib/cookie-writer';
import { isSecureWeb } from '@/lib/env';
import { type FormState, fromApiError, formText } from '@/lib/form-state';
import { continueLogin } from '@/lib/login-flow';
import { currentClientIp } from '@/lib/session';

export async function verifyActivationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const dni = formText(formData, 'dni');
  const code = formText(formData, 'code').replace(/[\s-]/g, '').toUpperCase();

  if (!DNI_PATTERN.test(dni)) {
    return { status: 'error', message: 'Revisa tu DNI.', fields: { dni: ['El DNI tiene 8 dígitos.'] } };
  }

  const result = await requestJson<ActivationChallenge>('/v1/activation/verify', {
    method: 'POST',
    body: { dni, code },
    clientIp: await currentClientIp(),
  });

  if (!result.ok) {
    return fromApiError(result.error);
  }

  await writeCookies([activationCookie(result.data, isSecureWeb())]);
  redirect('/activar/cuenta');
}

export async function completeActivationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const challenge = await pendingActivation();

  if (challenge === null) {
    redirect('/activar?vencido=1');
  }

  const password = formData.get('password');
  const confirmation = formData.get('confirmation');
  const email = formText(formData, 'email');

  if (typeof password !== 'string' || password.length < GUARDIAN_PASSWORD_MIN_LENGTH) {
    return {
      status: 'error',
      message: 'Revisa tu contraseña.',
      fields: { password: [`Usa al menos ${GUARDIAN_PASSWORD_MIN_LENGTH} caracteres.`] },
    };
  }

  if (password !== confirmation) {
    return { status: 'error', message: 'Las contraseñas no coinciden.', fields: { confirmation: ['Escribe la misma contraseña.'] } };
  }

  const result = await requestJson<LoginStep>('/v1/activation/complete', {
    method: 'POST',
    body: { challengeToken: challenge.challengeToken, password, ...(email.length > 0 ? { email } : {}) },
    clientIp: await currentClientIp(),
  });

  if (!result.ok) {
    if (result.error.code === 'ACTIVATION_INVALID' || result.error.code === 'LOGIN_CHALLENGE_INVALID') {
      await writeCookies([clearedActivationCookie(isSecureWeb())]);
    }

    return fromApiError(result.error);
  }

  await writeCookies([clearedActivationCookie(isSecureWeb())]);

  return continueLogin(result.data);
}
