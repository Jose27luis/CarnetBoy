import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_PREFIX = 'v1:';

export class TotpSecretCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
  }

  encrypt(secret: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);

    return FORMAT_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  decrypt(stored: string): string {
    if (!stored.startsWith(FORMAT_PREFIX)) {
      throw new Error('El secreto del segundo factor tiene un formato desconocido.');
    }

    const payload = Buffer.from(stored.slice(FORMAT_PREFIX.length), 'base64');
    const iv = payload.subarray(0, IV_BYTES);
    const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
