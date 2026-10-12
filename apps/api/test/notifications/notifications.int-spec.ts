import { addDays, parseCalendarDate } from '@carnet/clinical';
import type { ChildRecord, NotificationSettings } from '@carnet/contracts';
import { todayInLima } from '../../src/common/clinical/record-meta';
import { NotificationDelivery } from '../../src/modules/notifications/notification-delivery.service';
import { ReminderPlanner } from '../../src/modules/notifications/reminder-planner.service';
import {
  createAccount,
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  randomDni,
  request,
  signIn,
  signInDigitizerAt,
  type TestContext,
} from '../support/test-app';

describe('avisos al apoderado', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;
  let planner: ReminderPlanner;
  let delivery: NotificationDelivery;
  const today = todayInLima(new Date());
  const tenInLima = new Date(`${today}T15:00:00Z`);
  const midnightInLima = new Date(`${today}T05:30:00Z`);

  beforeAll(async () => {
    context = await createTestApp({ RESEND_API_KEY: 're_prueba', MAIL_FROM: 'Carnet CRED <avisos@prueba.pe>' });
    digitizer = await signInDigitizerAt(context);
    planner = context.app.get(ReminderPlanner);
    delivery = context.app.get(NotificationDelivery);
  });

  afterAll(async () => {
    await context.app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function childWithGuardian(email: string | null): Promise<{ child: ChildRecord; accountId: string }> {
    const child = (
      await request(context, {
        method: 'POST',
        url: '/v1/children',
        token: digitizer.token,
        headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
        payload: { dni: randomDni(), givenNames: 'Thiago', paternalSurname: 'Ramos', maternalSurname: 'Puma', sex: 'MALE', birthDate: '2026-04-01' },
      })
    ).json<ChildRecord>();
    const account = await createAccount(context, 'GUARDIAN');
    const guardian = await context.prisma.guardian.create({
      data: { dni: account.identifier, givenNames: 'Elena', paternalSurname: 'Puma', maternalSurname: 'Huanca', email, accountId: account.id },
    });
    await context.prisma.guardianLink.create({
      data: {
        childId: child.id,
        guardianId: guardian.id,
        relationship: 'MOTHER',
        status: 'ACTIVE',
        consentVersion: '2026-10',
        consentAt: new Date(),
        createdById: digitizer.id,
        facilityId: digitizer.facilityId,
      },
    });

    return { child, accountId: account.id };
  }

  function schedule(childId: string, scheduledOn: string): ReturnType<typeof request> {
    return request(context, {
      method: 'POST',
      url: `/v1/children/${childId}/appointments`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { type: 'GROWTH_CHECK', scheduledOn, origin: 'DIGITIZER' },
    });
  }

  it('avisa por correo una sola vez la cita a 3 días y nada fuera del horario', async () => {
    const { child, accountId } = await childWithGuardian('elena@prueba.pe');
    await schedule(child.id, addDays(parseCalendarDate(today), 3));

    const night = await planner.run(midnightInLima);
    const first = await planner.run(tenInLima);
    const second = await planner.run(tenInLima);
    const notifications = await context.prisma.notification.findMany({ where: { accountId, kind: 'APPOINTMENT_REMINDER' } });

    expect(night.queued).toHaveLength(0);
    expect(first.queued.length).toBeGreaterThan(0);
    expect(second.queued.filter((id) => notifications.some((notification) => notification.id === id))).toHaveLength(0);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ channel: 'EMAIL', title: 'Tienes una cita en 3 días' });
    expect(notifications[0]?.body).not.toMatch(/kg|g\/dL|anemia/i);
  });

  it('avisa una novedad en el carnet y respeta los avisos desactivados', async () => {
    const enabled = await childWithGuardian('activa@prueba.pe');
    const disabled = await childWithGuardian('apagada@prueba.pe');
    const guardian = await signIn(context, {
      id: disabled.accountId,
      identifier: (await context.prisma.guardian.findUniqueOrThrow({ where: { accountId: disabled.accountId } })).dni,
      role: 'GUARDIAN',
      totpSecret: '',
    });
    const settings = await request(context, {
      method: 'PUT',
      url: '/v1/me/notifications',
      token: guardian.token,
      payload: { emailEnabled: false, pushEnabled: false },
    });

    for (const { child } of [enabled, disabled]) {
      await request(context, {
        method: 'POST',
        url: `/v1/children/${child.id}/iron-supplies`,
        token: digitizer.token,
        headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
        payload: { suppliedOn: today, product: 'DROPS', doseInstructions: '2 gotas por kg al día', quantity: 1, purpose: 'PREVENTION' },
      });
    }

    await planner.run(tenInLima);

    expect(settings.json<NotificationSettings>()).toMatchObject({ emailEnabled: false, registeredEmail: 'apagada@prueba.pe', emailConfigured: true });
    expect(await context.prisma.notification.count({ where: { accountId: enabled.accountId, kind: 'CARNET_UPDATED' } })).toBe(1);
    expect(await context.prisma.notification.count({ where: { accountId: disabled.accountId } })).toBe(0);
  });

  it('marca enviado, reintenta ante fallas temporales y descarta los rechazos de Resend', async () => {
    const { child, accountId } = await childWithGuardian('entrega@prueba.pe');
    await schedule(child.id, today);
    await planner.run(tenInLima);
    const [notification] = await context.prisma.notification.findMany({ where: { accountId, kind: 'APPOINTMENT_REMINDER' } });
    const id = notification?.id ?? '';
    const fetchMock = jest.spyOn(global, 'fetch');

    fetchMock.mockResolvedValueOnce(new Response('falla', { status: 503 }));
    const retry = await delivery.deliver(id);
    fetchMock.mockResolvedValueOnce(new Response('{"id":"1"}', { status: 200 }));
    const sent = await delivery.deliver(id);
    const again = await delivery.deliver(id);

    expect(notification?.title).toBe('Hoy tienes una cita');
    expect(retry).toBe('RETRY');
    expect(sent).toBe('SENT');
    expect(again).toBe('IGNORED');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await context.prisma.notification.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'SENT', attempts: 2 });

    const other = await childWithGuardian('rechazo@prueba.pe');
    await request(context, {
      method: 'POST',
      url: `/v1/children/${other.child.id}/iron-supplies`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { suppliedOn: today, product: 'SYRUP', doseInstructions: '5 ml al día', quantity: 1, purpose: 'TREATMENT' },
    });
    await planner.run(tenInLima);
    const rejectedId = (await context.prisma.notification.findFirstOrThrow({ where: { accountId: other.accountId } })).id;
    fetchMock.mockResolvedValueOnce(new Response('{"message":"invalid"}', { status: 422 }));

    expect(await delivery.deliver(rejectedId)).toBe('FAILED');
  });
});
