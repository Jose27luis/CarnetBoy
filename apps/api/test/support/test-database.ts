import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_PATTERN = /^carnet_test_[a-z0-9_]+$/;
export const TEST_REDIS_DATABASE = 15;

export function assertTestDatabaseName(name: string): void {
  if (!TEST_DATABASE_PATTERN.test(name)) {
    throw new Error(`Solo se permiten bases de prueba carnet_test_*; se recibió "${name}"`);
  }
}

export function databaseUrlFor(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;

  return url.toString();
}

export function redisUrlForTests(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${TEST_REDIS_DATABASE}`;

  return url.toString();
}

export function createClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export async function withMaintenanceClient(baseUrl: string, work: (client: PrismaClient) => Promise<void>): Promise<void> {
  const client = createClient(databaseUrlFor(baseUrl, 'postgres'));

  try {
    await work(client);
  } finally {
    await client.$disconnect();
  }
}
