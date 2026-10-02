import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from '@carnet/contracts';
import type { FastifyReply } from 'fastify';
import { isTransientDatabaseError } from '../../infrastructure/prisma/transient-error';
import { DomainError } from './domain-error';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

const MESSAGE_BY_CODE: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'La solicitud no es válida.',
  UNAUTHENTICATED: 'Necesitas iniciar sesión.',
  FORBIDDEN: 'No tienes permiso para esta acción.',
  NOT_FOUND: 'El recurso no existe.',
  RATE_LIMITED: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const { status, body } = this.toResponse(exception);

    void reply.status(status).send(body);
  }

  private toResponse(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof DomainError) {
      const body: ApiErrorBody = { code: exception.code, message: exception.message };

      if (exception.fields !== undefined) {
        body.fields = exception.fields;
      }

      return { status: exception.status, body };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = CODE_BY_STATUS[status];

      if (code !== undefined) {
        return { status, body: { code, message: MESSAGE_BY_CODE[code] ?? exception.message } };
      }
    }

    if (isTransientDatabaseError(exception)) {
      this.logger.warn(`Base de datos saturada: ${exception instanceof Error ? exception.message : String(exception)}`);

      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Hay mucha demanda en este momento. Vuelve a intentarlo en unos segundos; tu solicitud no se duplicará.',
        },
      };
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' },
    };
  }
}
