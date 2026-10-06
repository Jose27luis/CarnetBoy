import { addDays, parseCalendarDate } from '@carnet/clinical';
import type { Agenda, ApiErrorBody, Appointment, ChildRecord, ChildSchedule } from '@carnet/contracts';
import { todayInLima } from '../../src/common/clinical/record-meta';
import {
  createAccount,
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  randomDni,
  request,
  signInDigitizerAt,
  type TestContext,
} from '../support/test-app';

describe('citas', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;
  const today = todayInLima(new Date());

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
    const creator = await createAccount(context, 'ADMIN');
    const version = await context.prisma.catalogVersion.create({
      data: {
        kind: 'APPOINTMENT_INTERVALS',
        norm: 'Intervalos de prueba',
        createdById: creator.id,
        appointmentIntervals: { create: [{ appointmentType: 'GROWTH_CHECK', minAgeMonths: 0, maxAgeMonths: 59, intervalDays: 30 }] },
      },
    });
    await context.prisma.catalogVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', validFrom: new Date('2020-01-01T00:00:00Z'), publishedAt: new Date() },
    });
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function registerChild(): Promise<ChildRecord> {
    const response = await request(context, {
      method: 'POST',
      url: '/v1/children',
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: {
        dni: randomDni(),
        givenNames: 'Mateo',
        paternalSurname: 'Huamán',
        maternalSurname: 'Ccori',
        sex: 'MALE',
        birthDate: addDays(parseCalendarDate(today), -100),
      },
    });

    return response.json<ChildRecord>();
  }

  function schedule(childId: string, payload: Record<string, unknown>): ReturnType<typeof request> {
    return request(context, {
      method: 'POST',
      url: `/v1/children/${childId}/appointments`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload,
    });
  }

  function childSchedule(childId: string): Promise<ChildSchedule> {
    return request(context, { method: 'GET', url: `/v1/children/${childId}/appointments`, token: digitizer.token, headers: digitizer.headers }).then((response) =>
      response.json<ChildSchedule>(),
    );
  }

  it('propone el control según el intervalo, programa la cita y rechaza otra del mismo tipo o en el pasado', async () => {
    const child = await registerChild();

    const before = await childSchedule(child.id);
    const created = await schedule(child.id, { type: 'GROWTH_CHECK', scheduledOn: today, origin: 'DIGITIZER' });
    const duplicated = await schedule(child.id, { type: 'GROWTH_CHECK', scheduledOn: addDays(parseCalendarDate(today), 3), origin: 'DIGITIZER' });
    const past = await schedule(child.id, { type: 'HEMOGLOBIN_TEST', scheduledOn: addDays(parseCalendarDate(today), -1), origin: 'DIGITIZER' });
    const after = await childSchedule(child.id);

    expect(before.intervalsPublished).toBe(true);
    expect(before.proposals.find((proposal) => proposal.type === 'GROWTH_CHECK')?.suggestedOn).toBe(today);
    expect(created.statusCode).toBe(201);
    expect(duplicated.json<ApiErrorBody>().code).toBe('APPOINTMENT_ALREADY_SCHEDULED');
    expect(past.statusCode).toBe(400);
    expect(after.upcoming).toHaveLength(1);
    expect(after.proposals.some((proposal) => proposal.type === 'GROWTH_CHECK')).toBe(false);
  });

  it('marca atendida la cita al registrar el control y la muestra en la agenda del día', async () => {
    const child = await registerChild();
    const appointment = (await schedule(child.id, { type: 'GROWTH_CHECK', scheduledOn: today, origin: 'SYSTEM' })).json<Appointment>();

    const agendaBefore = await request(context, { method: 'GET', url: '/v1/digitizer/agenda', token: digitizer.token, headers: digitizer.headers });
    await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/growth-checks`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { measuredOn: today, weightKg: '6.100', lengthCm: '61.0', position: 'LYING' },
    });
    const stored = await context.prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });

    expect(agendaBefore.json<Agenda>().appointments.map((item) => item.id)).toContain(appointment.id);
    expect(stored.status).toBe('ATTENDED');
    expect(stored.closedById).toBe(digitizer.id);
  });

  it('exige motivo para cancelar, no cierra dos veces y detecta versiones desactualizadas', async () => {
    const child = await registerChild();
    const appointment = (await schedule(child.id, { type: 'VACCINATION', scheduledOn: addDays(parseCalendarDate(today), 5), origin: 'DIGITIZER' })).json<Appointment>();
    const url = `/v1/appointments/${appointment.id}`;

    const rescheduled = await request(context, {
      method: 'PATCH',
      url,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { scheduledOn: addDays(parseCalendarDate(today), 7), expectedVersion: appointment.version },
    });
    const stale = await request(context, {
      method: 'POST',
      url: `${url}/close`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { status: 'MISSED', expectedVersion: appointment.version },
    });
    const withoutReason = await request(context, {
      method: 'POST',
      url: `${url}/close`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { status: 'CANCELLED', expectedVersion: appointment.version + 1 },
    });
    const cancelled = await request(context, {
      method: 'POST',
      url: `${url}/close`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { status: 'CANCELLED', reason: 'La familia viajó', expectedVersion: appointment.version + 1 },
    });
    const again = await request(context, {
      method: 'POST',
      url: `${url}/close`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { status: 'ATTENDED', expectedVersion: appointment.version + 2 },
    });

    expect(rescheduled.json<Appointment>().scheduledOn).toBe(addDays(parseCalendarDate(today), 7));
    expect(stale.json<ApiErrorBody>().code).toBe('VERSION_CONFLICT');
    expect(withoutReason.statusCode).toBe(400);
    expect(cancelled.json<Appointment>()).toMatchObject({ status: 'CANCELLED', cancelReason: 'La familia viajó' });
    expect(again.json<ApiErrorBody>().code).toBe('APPOINTMENT_NOT_SCHEDULED');
  });
});
