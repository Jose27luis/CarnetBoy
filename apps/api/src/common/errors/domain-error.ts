import { HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@carnet/contracts';

export type FieldErrors = Record<string, string[]>;

export class DomainError extends Error {
  constructor(
    readonly status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static validation(fields: FieldErrors): DomainError {
    return new DomainError(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Hay datos inválidos en la solicitud.', fields);
  }

  static unauthenticated(message = 'Necesitas iniciar sesión.'): DomainError {
    return new DomainError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'No tienes permiso para esta acción.'): DomainError {
    return new DomainError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
  }

  static notFound(message: string): DomainError {
    return new DomainError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(code: ErrorCode, message: string): DomainError {
    return new DomainError(HttpStatus.CONFLICT, code, message);
  }

  static unprocessable(code: ErrorCode, message: string): DomainError {
    return new DomainError(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
  }

  static serviceUnavailable(message: string): DomainError {
    return new DomainError(HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE', message);
  }
}
