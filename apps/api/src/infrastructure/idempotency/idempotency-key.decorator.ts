import { createParamDecorator, type ExecutionContext, HttpStatus } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedRequest } from '../auth/authenticated-user';

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const IdempotencyKey = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const header = context.switchToHttp().getRequest<AuthenticatedRequest>().headers['idempotency-key'];
  const key = Array.isArray(header) ? header[0] : header;

  if (key === undefined || key.length === 0) {
    throw new DomainError(
      HttpStatus.PRECONDITION_REQUIRED,
      'IDEMPOTENCY_KEY_REQUIRED',
      'Esta operación exige el encabezado Idempotency-Key.',
    );
  }

  if (!KEY_PATTERN.test(key)) {
    throw DomainError.validation({ 'Idempotency-Key': ['Usa entre 16 y 64 letras, números, guiones o guiones bajos.'] });
  }

  return key;
});
