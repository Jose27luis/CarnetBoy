import { createHash, randomInt } from 'node:crypto';
import { ACTIVATION_CODE_ALPHABET, ACTIVATION_CODE_LENGTH, ACTIVATION_CODE_TTL_DAYS } from '@carnet/contracts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateActivationCode(): string {
  return Array.from({ length: ACTIVATION_CODE_LENGTH }, () => ACTIVATION_CODE_ALPHABET.charAt(randomInt(ACTIVATION_CODE_ALPHABET.length))).join('');
}

export function normalizeActivationCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export function hashActivationCode(code: string): string {
  return createHash('sha256').update(normalizeActivationCode(code)).digest('hex');
}

export function activationCodeExpiry(now: Date): Date {
  return new Date(now.getTime() + ACTIVATION_CODE_TTL_DAYS * DAY_MS);
}
