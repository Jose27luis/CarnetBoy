import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { assertTestDatabaseName, databaseUrlFor, redisUrlForTests, withMaintenanceClient } from './test-database';

export default async function globalSetup(): Promise<void> {
  const baseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (baseUrl === undefined || baseUrl.length === 0 || redisUrl === undefined || redisUrl.length === 0) {
    throw new Error('DATABASE_URL y REDIS_URL son obligatorios para las pruebas de integración');
  }

  const databaseName = `carnet_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
  assertTestDatabaseName(databaseName);

  await withMaintenanceClient(baseUrl, async (client) => {
    await client.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  });

  const testUrl = databaseUrlFor(baseUrl, databaseName);

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'ignore',
  });

  process.env.CARNET_BASE_DATABASE_URL = baseUrl;
  process.env.CARNET_TEST_DATABASE = databaseName;
  process.env.DATABASE_URL = testUrl;
  process.env.REDIS_URL = redisUrlForTests(redisUrl);
}
