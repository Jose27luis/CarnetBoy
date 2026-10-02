import { Prisma } from '@prisma/client';

const TRANSACTION_API_ERROR = 'P2028';

export function isTransientDatabaseError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === TRANSACTION_API_ERROR;
}
