import { Inject, Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { ENV } from '../../../config/env.module';
import type { Env } from '../../../config/env';
import { TotpSecretCipher } from './totp-secret-cipher';

const EPOCH_TOLERANCE_SECONDS = 30;

@Injectable()
export class TotpService {
  private readonly cipher: TotpSecretCipher;
  private readonly issuer: string;

  constructor(@Inject(ENV) env: Env) {
    this.cipher = new TotpSecretCipher(env.TOTP_ENCRYPTION_KEY);
    this.issuer = env.TOTP_ISSUER;
  }

  createSecret(): string {
    return generateSecret();
  }

  encrypt(secret: string): string {
    return this.cipher.encrypt(secret);
  }

  qrSvg(email: string, secret: string): Promise<string> {
    const uri = generateURI({ issuer: this.issuer, label: email, secret });

    return QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  }

  matchingTimeStep(encryptedSecret: string, code: string, lastTimeStep: number | null, now: Date): number | null {
    const result = verifySync({
      secret: this.cipher.decrypt(encryptedSecret),
      token: code,
      epoch: Math.floor(now.getTime() / 1000),
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      ...(lastTimeStep === null ? {} : { afterTimeStep: lastTimeStep }),
    });

    return result.valid && 'timeStep' in result ? result.timeStep : null;
  }
}
