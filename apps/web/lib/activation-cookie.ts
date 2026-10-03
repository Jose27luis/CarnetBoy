import 'server-only';
import type { ActivationChallenge } from '@carnet/contracts';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { CookieToSet } from './session-cookies';

export const ACTIVATION_COOKIE = 'cc_activation';

const nameSchema = z.object({ givenNames: z.string(), paternalSurname: z.string(), maternalSurname: z.string() });
const challengeSchema = z.object({
  challengeToken: z.string().min(20),
  challengeExpiresAt: z.string(),
  guardian: nameSchema,
  children: z.array(nameSchema),
});

export function activationCookie(challenge: ActivationChallenge, secure: boolean, now: number = Date.now()): CookieToSet {
  return {
    name: ACTIVATION_COOKIE,
    value: Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64url'),
    options: {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: Math.max(0, Math.floor((Date.parse(challenge.challengeExpiresAt) - now) / 1000)),
    },
  };
}

export function clearedActivationCookie(secure: boolean): CookieToSet {
  return { name: ACTIVATION_COOKIE, value: '', options: { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 } };
}

export async function pendingActivation(): Promise<ActivationChallenge | null> {
  const raw = (await cookies()).get(ACTIVATION_COOKIE)?.value;

  if (raw === undefined) {
    return null;
  }

  try {
    const parsed = challengeSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
