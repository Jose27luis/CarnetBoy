import 'server-only';
import type { LoginStep } from '@carnet/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { writeCookies } from './cookie-writer';
import { isSecureWeb } from './env';
import { safeReturnPath } from './safe-redirect';
import { HOME_BY_ROLE } from './session';
import {
  CHALLENGE_COOKIE,
  type ChallengeStep,
  challengeCookie,
  clearedChallengeCookie,
  parseChallengeCookie,
  type PendingChallenge,
  sessionCookies,
} from './session-cookies';

const PAGE_BY_STEP: Record<ChallengeStep, string> = {
  PASSWORD_CHANGE_REQUIRED: '/ingresar/contrasena',
  TOTP_ENROLLMENT_REQUIRED: '/ingresar/configurar-verificacion',
  TOTP_REQUIRED: '/ingresar/verificacion',
};

export async function continueLogin(step: LoginStep, returnTo: string | null = null): Promise<never> {
  const secure = isSecureWeb();

  if (step.step === 'AUTHENTICATED') {
    await writeCookies([...sessionCookies(step.tokens, secure), clearedChallengeCookie(secure)]);
    const home = HOME_BY_ROLE[step.account.role];

    redirect(step.account.role === 'ADMIN' ? safeReturnPath(returnTo, home) : home);
  }

  await writeCookies([
    challengeCookie({ step: step.step, challengeToken: step.challengeToken }, step.challengeExpiresAt, secure),
  ]);

  redirect(PAGE_BY_STEP[step.step]);
}

export async function pendingChallenge(allowed: readonly ChallengeStep[]): Promise<PendingChallenge> {
  const challenge = parseChallengeCookie((await cookies()).get(CHALLENGE_COOKIE)?.value);

  if (challenge === null || !allowed.includes(challenge.step)) {
    redirect('/ingresar?vencido=1');
  }

  return challenge;
}

export async function abandonChallenge(): Promise<void> {
  await writeCookies([clearedChallengeCookie(isSecureWeb())]);
}
