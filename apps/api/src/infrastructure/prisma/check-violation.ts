import { Prisma } from '@prisma/client';
import { z } from 'zod';

const CHECK_VIOLATION = '23514';

const checkViolationMetaSchema = z.object({
  driverAdapterError: z.object({ cause: z.object({ originalCode: z.literal(CHECK_VIOLATION) }) }),
});

export function isCheckViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && checkViolationMetaSchema.safeParse(error.meta).success;
}
