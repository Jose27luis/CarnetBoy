import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const GROUP_LENGTH = 4;
const GROUPS = 4;

export function generateTemporaryPassword(): string {
  const groups = Array.from({ length: GROUPS }, () =>
    Array.from({ length: GROUP_LENGTH }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join(''),
  );

  return groups.join('-');
}
