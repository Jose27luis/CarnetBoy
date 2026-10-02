import { Prisma } from '@prisma/client';
import { isTransientDatabaseError } from './transient-error';

function knownError(code: string, message: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: Prisma.prismaVersion.client });
}

describe('transient-error', () => {
  it('reconoce la transacción que no consiguió conexión a tiempo, observada en la prueba de carga', () => {
    expect(isTransientDatabaseError(knownError('P2028', 'Transaction API error: Unable to start a transaction in the given time.'))).toBe(true);
  });

  it('no confunde violaciones de restricciones ni errores comunes con saturación', () => {
    expect(isTransientDatabaseError(knownError('P2002', 'Unique constraint failed'))).toBe(false);
    expect(isTransientDatabaseError(new Error('Unable to start a transaction in the given time.'))).toBe(false);
    expect(isTransientDatabaseError(null)).toBe(false);
  });
});
