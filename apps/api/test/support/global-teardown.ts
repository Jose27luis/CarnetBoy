import { assertTestDatabaseName, withMaintenanceClient } from './test-database';

export default async function globalTeardown(): Promise<void> {
  const baseUrl = process.env.CARNET_BASE_DATABASE_URL;
  const databaseName = process.env.CARNET_TEST_DATABASE;

  if (baseUrl === undefined || databaseName === undefined) {
    return;
  }

  assertTestDatabaseName(databaseName);

  await withMaintenanceClient(baseUrl, async (client) => {
    await client.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  });
}
