import { createHash, randomBytes } from 'node:crypto';

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const ROTATION_GRACE_SECONDS = 30;

export function rotationGraceKey(refreshTokenHash: string): string {
  return `session:rotated:${refreshTokenHash}`;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
