import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ARGON2_OPTIONS } from '../modules/identity/credentials/argon2-options';
import { normalizeEmail } from '../modules/identity/credentials/email';
import { generateTemporaryPassword } from '../modules/identity/credentials/temporary-password';

const argumentsSchema = z.tuple([z.email(), z.string().trim().min(3).max(160)]);

async function createAdmin(): Promise<void> {
  const parsed = argumentsSchema.safeParse(process.argv.slice(2));

  if (!parsed.success) {
    throw new Error('Uso: node dist/scripts/create-admin.js <correo> "<nombre completo>"');
  }

  const [email, fullName] = parsed.data;
  const databaseUrl = z.string().min(1).parse(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const temporaryPassword = generateTemporaryPassword();

  try {
    const passwordHash = await hash(temporaryPassword, ARGON2_OPTIONS);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.account.findUnique({ where: { email: normalizeEmail(email) } });

      if (existing !== null) {
        throw new Error(`Ya existe una cuenta con ${email}`);
      }

      const account = await tx.account.create({
        data: { email: normalizeEmail(email), fullName, role: 'ADMIN', passwordHash, passwordChangeRequired: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'account.created',
          entity: 'account',
          entityId: account.id,
          after: { email: account.email, fullName: account.fullName, role: account.role, source: 'console' },
        },
      });
    });

    process.stdout.write(`Administrador creado. Contraseña temporal (se muestra una sola vez): ${temporaryPassword}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
