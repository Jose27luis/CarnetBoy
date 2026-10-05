import { PrismaPg } from '@prisma/adapter-pg';
import { type CatalogKind, Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  DRAFT_ALTITUDE_ADJUSTMENTS,
  DRAFT_DOSES,
  DRAFT_THRESHOLDS,
  DRAFT_VACCINES,
  HEMOGLOBIN_NORM,
  SCHEDULE_NORM,
} from './catalog-drafts-data';

type Tx = Prisma.TransactionClient;

async function existingDraft(tx: Tx, kind: CatalogKind, norm: string): Promise<boolean> {
  return (await tx.catalogVersion.count({ where: { kind, norm } })) > 0;
}

async function createScheduleDraft(tx: Tx, adminId: string): Promise<string> {
  if (await existingDraft(tx, 'VACCINATION_SCHEDULE', SCHEDULE_NORM)) {
    return 'El borrador del esquema de vacunación ya existe; no se tocó.';
  }

  const vaccineIds = new Map<string, string>();

  for (const vaccine of DRAFT_VACCINES) {
    const row = await tx.vaccine.upsert({ where: { code: vaccine.code }, create: vaccine, update: {}, select: { id: true } });
    vaccineIds.set(vaccine.code, row.id);
  }

  const version = await tx.catalogVersion.create({
    data: {
      kind: 'VACCINATION_SCHEDULE',
      norm: SCHEDULE_NORM,
      createdById: adminId,
      scheduledDoses: {
        create: DRAFT_DOSES.map(({ vaccineCode, ...dose }) => ({ ...dose, vaccineId: z.string().parse(vaccineIds.get(vaccineCode)) })),
      },
    },
  });
  await tx.auditEvent.create({
    data: { actorId: adminId, action: 'catalog_version.created', entity: 'catalog_version', entityId: version.id, after: { kind: version.kind, norm: version.norm, source: 'console' } },
  });

  return `Borrador del esquema de vacunación creado con ${DRAFT_DOSES.length} dosis.`;
}

async function createHemoglobinDraft(tx: Tx, adminId: string): Promise<string> {
  if (await existingDraft(tx, 'HEMOGLOBIN_THRESHOLDS', HEMOGLOBIN_NORM)) {
    return 'El borrador de umbrales de hemoglobina ya existe; no se tocó.';
  }

  const version = await tx.catalogVersion.create({
    data: {
      kind: 'HEMOGLOBIN_THRESHOLDS',
      norm: HEMOGLOBIN_NORM,
      createdById: adminId,
      hemoglobinThresholds: {
        create: DRAFT_THRESHOLDS.map((row) => ({
          minAgeMonths: row.minAgeMonths,
          maxAgeMonths: row.maxAgeMonths,
          normalFrom: new Prisma.Decimal(row.normalFrom),
          mildFrom: new Prisma.Decimal(row.mildFrom),
          moderateFrom: new Prisma.Decimal(row.moderateFrom),
        })),
      },
      altitudeAdjustments: {
        create: DRAFT_ALTITUDE_ADJUSTMENTS.map((row) => ({ minAltitude: row.minAltitude, maxAltitude: row.maxAltitude, subtract: new Prisma.Decimal(row.subtract) })),
      },
    },
  });
  await tx.auditEvent.create({
    data: { actorId: adminId, action: 'catalog_version.created', entity: 'catalog_version', entityId: version.id, after: { kind: version.kind, norm: version.norm, source: 'console' } },
  });

  return `Borrador de hemoglobina creado con ${DRAFT_THRESHOLDS.length} umbrales y ${DRAFT_ALTITUDE_ADJUSTMENTS.length} tramos de altitud.`;
}

async function createCatalogDrafts(): Promise<void> {
  const databaseUrl = z.string().min(1).parse(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const messages = await prisma.$transaction(async (tx) => {
      const admin = await tx.account.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true } });

      if (admin === null) {
        throw new Error('No hay ningún administrador; créalo antes de cargar los borradores.');
      }

      return [await createHemoglobinDraft(tx, admin.id), await createScheduleDraft(tx, admin.id)];
    });

    process.stdout.write(`${messages.join('\n')}\nNada rige hasta que el administrador publique cada borrador.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

createCatalogDrafts().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
