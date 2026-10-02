import { Prisma } from '@prisma/client';
import { z } from 'zod';

const uniqueViolationMetaSchema = z.object({
  driverAdapterError: z.object({
    cause: z.object({
      constraint: z.union([z.object({ index: z.string() }), z.object({ fields: z.array(z.string()) })]).optional(),
    }),
  }),
});

export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function violatedUniqueIndex(error: unknown): string | null {
  if (!isUniqueViolation(error)) {
    return null;
  }

  const meta = uniqueViolationMetaSchema.safeParse(error.meta);

  if (!meta.success) {
    return null;
  }

  const constraint = meta.data.driverAdapterError.cause.constraint;

  return constraint !== undefined && 'index' in constraint ? constraint.index : null;
}
