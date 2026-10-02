import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginChallenge } from '@carnet/contracts';
import { z } from 'zod';
import { DomainError } from '../../../common/errors/domain-error';

export const LOGIN_CHALLENGE_STAGES = ['PASSWORD_CHANGE', 'TOTP_ENROLLMENT', 'TOTP'] as const;
export type LoginChallengeStage = (typeof LOGIN_CHALLENGE_STAGES)[number];

const CHALLENGE_TTL_SECONDS = 10 * 60;
const CHALLENGE_AUDIENCE = 'carnet:login-challenge';

const challengePayloadSchema = z.object({
  sub: z.uuid(),
  stage: z.enum(LOGIN_CHALLENGE_STAGES),
});

@Injectable()
export class LoginChallengeService {
  constructor(private readonly jwt: JwtService) {}

  issue(accountId: string, stage: LoginChallengeStage, now: Date = new Date()): LoginChallenge {
    const challengeToken = this.jwt.sign(
      { sub: accountId, stage },
      { expiresIn: CHALLENGE_TTL_SECONDS, audience: CHALLENGE_AUDIENCE },
    );

    return {
      challengeToken,
      challengeExpiresAt: new Date(now.getTime() + CHALLENGE_TTL_SECONDS * 1000).toISOString(),
    };
  }

  accountFor(challengeToken: string, allowedStages: readonly LoginChallengeStage[]): string {
    let decoded: unknown;

    try {
      decoded = this.jwt.verify<object>(challengeToken, { audience: CHALLENGE_AUDIENCE });
    } catch {
      throw this.invalid();
    }

    const payload = challengePayloadSchema.safeParse(decoded);

    if (!payload.success || !allowedStages.includes(payload.data.stage)) {
      throw this.invalid();
    }

    return payload.data.sub;
  }

  private invalid(): DomainError {
    return new DomainError(
      HttpStatus.UNAUTHORIZED,
      'LOGIN_CHALLENGE_INVALID',
      'El paso de verificación venció o no es válido. Vuelve a ingresar tu correo y contraseña.',
    );
  }
}
