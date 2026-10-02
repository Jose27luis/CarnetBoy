import { randomUUID } from 'node:crypto';
import { createTestApp, type TestContext } from '../support/test-app';

describe('restricciones de la base', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('mantiene la auditoría como tabla de solo inserción', async () => {
    const event = await context.prisma.auditEvent.create({
      data: { action: 'facility.created', entity: 'facility', entityId: randomUUID() },
    });

    await expect(
      context.prisma.auditEvent.update({ where: { id: event.id }, data: { action: 'facility.updated' } }),
    ).rejects.toThrow(/solo inserción/);
    await expect(context.prisma.auditEvent.delete({ where: { id: event.id } })).rejects.toThrow(/solo inserción/);
    await expect(context.prisma.$executeRawUnsafe('TRUNCATE audit_events')).rejects.toThrow(/solo inserción/);
  });

  it('rechaza una altitud fuera de rango aunque se salte la API', async () => {
    await expect(
      context.prisma.facility.create({
        data: { ipressCode: '00099999', name: 'Fuera de rango', healthNetwork: 'Red de prueba', altitudeMeters: 9000 },
      }),
    ).rejects.toThrow(/facilities_altitude_range/);
  });
});
