import type { AuthTokens, LoginStep } from '@carnet/contracts';

export const ACCESS_COOKIE = 'cc_access';
export const REFRESH_COOKIE = 'cc_refresh';
export const CHALLENGE_COOKIE = 'cc_challenge';

const REFRESH_MARGIN_SECONDS = 30;
const CHALLENGE_SEPARATOR = '|';

export type ChallengeStep = Exclude<LoginStep['step'], 'AUTHENTICATED'>;

const CHALLENGE_STEPS: readonly ChallengeStep[] = ['PASSWORD_CHANGE_REQUIRED', 'TOTP_ENROLLMENT_REQUIRED', 'TOTP_REQUIRED'];

export interface CookieToSet {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax' | 'strict';
    path: '/';
    maxAge: number;
  };
}

export interface PendingChallenge {
  step: ChallengeStep;
  challengeToken: string;
}

function secondsUntil(isoDate: string, now: number): number {
  return Math.max(0, Math.floor((Date.parse(isoDate) - now) / 1000));
}

export function sessionCookies(tokens: AuthTokens, secure: boolean, now: number = Date.now()): CookieToSet[] {
  const base = { httpOnly: true, secure, sameSite: 'lax', path: '/' } as const;

  return [
    {
      name: ACCESS_COOKIE,
      value: tokens.accessToken,
      options: { ...base, maxAge: Math.max(0, secondsUntil(tokens.accessTokenExpiresAt, now) - REFRESH_MARGIN_SECONDS) },
    },
    {
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      options: { ...base, maxAge: secondsUntil(tokens.refreshTokenExpiresAt, now) },
    },
  ];
}

export function clearedSessionCookies(secure: boolean): CookieToSet[] {
  const base = { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 } as const;

  return [
    { name: ACCESS_COOKIE, value: '', options: base },
    { name: REFRESH_COOKIE, value: '', options: base },
  ];
}

export function challengeCookie(challenge: PendingChallenge, expiresAt: string, secure: boolean, now: number = Date.now()): CookieToSet {
  return {
    name: CHALLENGE_COOKIE,
    value: `${challenge.step}${CHALLENGE_SEPARATOR}${challenge.challengeToken}`,
    options: { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: secondsUntil(expiresAt, now) },
  };
}

export function clearedChallengeCookie(secure: boolean): CookieToSet {
  return { name: CHALLENGE_COOKIE, value: '', options: { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 } };
}

export function parseChallengeCookie(value: string | undefined): PendingChallenge | null {
  if (value === undefined) {
    return null;
  }

  const separator = value.indexOf(CHALLENGE_SEPARATOR);
  const step = value.slice(0, separator);
  const challengeToken = value.slice(separator + 1);
  const knownStep = CHALLENGE_STEPS.find((candidate) => candidate === step);

  return separator > 0 && knownStep !== undefined && challengeToken.length > 0 ? { step: knownStep, challengeToken } : null;
}
