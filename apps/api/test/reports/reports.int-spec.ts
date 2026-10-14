import type { AdminDashboard, ChildRecord, DigitizerDashboard } from '@carnet/contracts';
import { todayInLima } from '../../src/common/clinical/record-meta';
import { createTestApp, type FieldDigitizer, idempotencyKey, randomDni, request, signInAs, signInDigitizerAt, type TestContext } from '../support/test-app';

describe('tableros', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('agrega la actividad del sistema y del establecimiento sin nombres en el tablero del admin', async () => {
    const today = todayInLima(new Date());
    const child = (
      await request(context, {
        method: 'POST',
        url: '/v1/children',
        token: digitizer.token,
        headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
        payload: { dni: randomDni(), givenNames: 'Renata', paternalSurname: 'Vilca', maternalSurname: 'Sulca', sex: 'FEMALE', birthDate: '2026-02-01' },
      })
    ).json<ChildRecord>();
    await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/growth-checks`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { measuredOn: today, weightKg: '6.400', lengthCm: '63.0', position: 'LYING' },
    });
    await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/appointments`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { type: 'GROWTH_CHECK', scheduledOn: today, origin: 'DIGITIZER' },
    });
    const admin = await signInAs(context, 'ADMIN');

    const adminResponse = await request(context, { method: 'GET', url: '/v1/admin/dashboard', token: admin.token });
    const facility = await request(context, { method: 'GET', url: '/v1/digitizer/dashboard', token: digitizer.token, headers: digitizer.headers });
    const forbidden = await request(context, { method: 'GET', url: '/v1/admin/dashboard', token: digitizer.token });
    const board = adminResponse.json<AdminDashboard>();
    const local = facility.json<DigitizerDashboard>();

    expect(adminResponse.statusCode).toBe(200);
    expect(board.totals.children).toBeGreaterThan(0);
    expect(board.monthly).toHaveLength(6);
    expect(board.monthly.at(-1)?.registrations).toBeGreaterThan(0);
    expect(board.nutrition.reduce((total, item) => total + item.count, 0)).toBeGreaterThan(0);
    expect(adminResponse.body).not.toContain('Renata');
    expect(local.month.registrations).toBe(1);
    expect(local.month.growthChecks).toBe(1);
    expect(local.weekly).toHaveLength(8);
    expect(local.weekly.at(-1)?.records).toBe(1);
    expect(local.today.scheduled).toBe(1);
    expect(local.today.attended).toBe(0);
    expect(local.upcoming.map((appointment) => appointment.childId)).toContain(child.id);
    expect(forbidden.statusCode).toBe(403);
  });
});
