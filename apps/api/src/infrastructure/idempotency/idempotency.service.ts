import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../prisma/prisma.service';
import type { Tx } from '../prisma/transaction';
import { requestHash } from './canonical-hash';
import { toJson } from './to-json';

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotentRequest {
  accountId: string;
  key: string;
  operation: string;
  body: unknown;
  status: number;
}

export interface IdempotentOperation<Ref extends object, Result> {
  precheck?: () => Promise<void>;
  effect: (tx: Tx) => Promise<Ref>;
  reference: z.ZodType<Ref>;
  present: (reference: Ref) => Promise<Result>;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async run<Ref extends object, Result>(
    request: IdempotentRequest,
    operation: IdempotentOperation<Ref, Result>,
    now: Date = new Date(),
  ): Promise<Result> {
    const hash = requestHash(request.operation, request.body);
    const replay = await this.storedReference(request, hash, operation.reference, now);

    if (replay !== null) {
      return operation.present(replay);
    }

    await operation.precheck?.();

    let reference: Ref;

    try {
      reference = await this.prisma.$transaction(async (tx) => {
        const created = await operation.effect(tx);
        await tx.idempotencyKey.create({
          data: {
            accountId: request.accountId,
            key: request.key,
            operation: request.operation,
            requestHash: hash,
            responseStatus: request.status,
            responseBody: toJson(created) ?? {},
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });

        return created;
      });
    } catch (error) {
      const concurrent = await this.storedReference(request, hash, operation.reference, now);

      if (concurrent === null) {
        throw error;
      }

      reference = concurrent;
    }

    return operation.present(reference);
  }

  private async storedReference<Ref extends object>(
    request: IdempotentRequest,
    hash: string,
    schema: z.ZodType<Ref>,
    now: Date,
  ): Promise<Ref | null> {
    const stored = await this.prisma.idempotencyKey.findUnique({
      where: { accountId_key: { accountId: request.accountId, key: request.key } },
    });

    if (stored === null) {
      return null;
    }

    if (stored.expiresAt <= now) {
      await this.prisma.idempotencyKey.deleteMany({
        where: { accountId: request.accountId, key: request.key, expiresAt: { lte: now } },
      });

      return null;
    }

    if (stored.requestHash !== hash || stored.operation !== request.operation) {
      throw DomainError.unprocessable(
        'IDEMPOTENCY_KEY_REUSED',
        'Esa clave de idempotencia ya se usó con otra solicitud. Genera una clave nueva.',
      );
    }

    return schema.parse(stored.responseBody);
  }
}
