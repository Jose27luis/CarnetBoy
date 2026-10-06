import type { ApiErrorBody, ChildRecord, FacilityActivity, LinkCreated } from '@carnet/contracts';
import { CONSENT_VERSION } from '@carnet/contracts';
import {
  createAccount,
  createFacility,
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  randomDni,
  request,
  signInAs,
  signInDigitizerAt,
  type TestContext,
} from '../support/test-app';

describe('niños y vínculos', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
  });

  afterAll(async () => {
    await context.app.close();
  });

  function childPayload(dni: string = randomDni()): Record<string, unknown> {
    return {
      dni,
      givenNames: 'Valentina',
      paternalSurname: 'Quispe',
      maternalSurname: 'Mamani',
      sex: 'FEMALE',
      birthDate: '2026-04-12',
      birth: { deliveryType: 'VAGINAL', weightGrams: 3200, lengthCm: '49.5' },
    };
  }

  async function registerChild(payload: Record<string, unknown> = childPayload(), key: string = idempotencyKey()): Promise<ReturnType<typeof request>> {
    return request(context, {
      method: 'POST',
      url: '/v1/children',
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': key },
      payload,
    });
  }

  function linkPayload(guardianDni: string): Record<string, unknown> {
    return {
      guardianDni,
      guardian: { givenNames: 'Rosa', paternalSurname: 'Mamani', maternalSurname: 'Huamán', phone: '987654321' },
      relationship: 'MOTHER',
      consentAccepted: true,
      consentVersion: CONSENT_VERSION,
    };
  }

  it('rechaza a un digitador sin asignación en el establecimiento y a un admin', async () => {
    const otherFacility = await createFacility(context);
    const admin = await signInAs(context, 'ADMIN');

    const unassigned = await request(context, {
      method: 'GET',
      url: '/v1/children/search?document=12345678',
      token: digitizer.token,
      headers: { 'x-facility-id': otherFacility },
    });
    const asAdmin = await request(context, {
      method: 'GET',
      url: '/v1/children/search?document=12345678',
      token: admin.token,
      headers: { 'x-facility-id': digitizer.facilityId },
    });

    expect(unassigned.statusCode).toBe(403);
    expect(unassigned.json<ApiErrorBody>().code).toBe('FACILITY_NOT_ASSIGNED');
    expect(asAdmin.statusCode).toBe(403);
  });

  it('registra al niño, repite la respuesta con la misma clave y rechaza el DNI duplicado', async () => {
    const payload = childPayload();
    const key = idempotencyKey();

    const first = await registerChild(payload, key);
    const replay = await registerChild(payload, key);
    const duplicated = await registerChild(payload);

    expect(first.statusCode).toBe(201);
    expect(replay.json<ChildRecord>().id).toBe(first.json<ChildRecord>().id);
    expect(first.json<ChildRecord>().birth?.lengthCm).toBe('49.5');
    expect(duplicated.json<ApiErrorBody>().code).toBe('CHILD_DOCUMENT_TAKEN');
  });

  it('rechaza una fecha de nacimiento futura y un niño sin documento', async () => {
    const future = await registerChild({ ...childPayload(), birthDate: '2099-01-01' });
    const withoutDocument = await registerChild({ ...childPayload(), dni: undefined });

    expect(future.statusCode).toBe(400);
    expect(withoutDocument.json<ApiErrorBody>().code).toBe('CHILD_DOCUMENT_REQUIRED');
  });

  it('rechaza medidas al nacer fuera de rango con el campo señalado', async () => {
    const response = await registerChild({ ...childPayload(), birth: { lengthCm: '49.5', headCircumferenceCm: '50.0' } });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().fields).toEqual({ 'birth.headCircumferenceCm': ['El perímetro cefálico al nacer va de 18 a 45 cm.'] });
  });

  it('encuentra al niño por DNI o CNV y deja la lectura de la ficha en la auditoría', async () => {
    const cnv = `10${randomDni()}`;
    const child = (await registerChild({ ...childPayload(), cnv })).json<ChildRecord>();

    const byCnv = await request(context, { method: 'GET', url: `/v1/children/search?document=${cnv}`, token: digitizer.token, headers: digitizer.headers });
    const record = await request(context, { method: 'GET', url: `/v1/children/${child.id}`, token: digitizer.token, headers: digitizer.headers });
    const views = await context.prisma.auditEvent.count({ where: { action: 'child.viewed', entityId: child.id, actorId: digitizer.id } });

    expect(byCnv.json<{ child: { id: string } | null }>().child?.id).toBe(child.id);
    expect(record.statusCode).toBe(200);
    expect(views).toBe(1);
  });

  it('vincula un apoderado con código y no duplica el vínculo', async () => {
    const child = (await registerChild()).json<ChildRecord>();
    const guardianDni = randomDni();

    const created = await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/links`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: linkPayload(guardianDni),
    });
    const repeated = await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/links`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: linkPayload(guardianDni),
    });

    const body = created.json<LinkCreated>();
    expect(created.statusCode).toBe(201);
    expect(body.link.status).toBe('PENDING');
    expect(body.activationCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(repeated.json<ApiErrorBody>().code).toBe('LINK_ALREADY_EXISTS');

    const stored = await context.prisma.activationCode.findFirstOrThrow({ where: { linkId: body.link.id } });
    expect(stored.codeHash).not.toContain(body.activationCode ?? '');
  });

  it('exige el consentimiento para vincular', async () => {
    const child = (await registerChild()).json<ChildRecord>();

    const response = await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/links`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { ...linkPayload(randomDni()), consentAccepted: false },
    });

    expect(response.statusCode).toBe(400);
  });

  it('activa de inmediato el vínculo de un apoderado que ya tiene cuenta', async () => {
    const guardian = await createAccount(context, 'GUARDIAN');
    await context.prisma.guardian.create({
      data: { dni: guardian.identifier, givenNames: 'Luis', paternalSurname: 'Torres', maternalSurname: 'Ccori', accountId: guardian.id },
    });
    const child = (await registerChild()).json<ChildRecord>();

    const response = await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/links`,
      token: digitizer.token,
      headers: digitizer.headers,
      payload: { ...linkPayload(guardian.identifier), guardian: undefined, relationship: 'FATHER' },
    });

    expect(response.json<LinkCreated>().link.status).toBe('ACTIVE');
    expect(response.json<LinkCreated>().activationCode).toBeNull();
  });

  it('cuenta los niños y vínculos de cada establecimiento para el admin', async () => {
    const field = await signInDigitizerAt(context);
    const admin = await signInAs(context, 'ADMIN');
    const child = (
      await request(context, {
        method: 'POST',
        url: '/v1/children',
        token: field.token,
        headers: { ...field.headers, 'idempotency-key': idempotencyKey() },
        payload: childPayload(),
      })
    ).json<ChildRecord>();
    await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/links`,
      token: field.token,
      headers: field.headers,
      payload: linkPayload(randomDni()),
    });

    const response = await request(context, { method: 'GET', url: '/v1/admin/facility-activity', token: admin.token });
    const activity = response.json<FacilityActivity[]>().find((item) => item.facilityId === field.facilityId);

    expect(activity).toEqual({ facilityId: field.facilityId, childrenRegistered: 1, linksCreated: 1 });
  });
});
