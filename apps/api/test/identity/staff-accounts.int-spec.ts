import type { ApiErrorBody, StaffAccountCreated } from '@carnet/contracts';
import { createAccount, createTestApp, login, request, type SignedInAccount, signInAs, type TestContext } from '../support/test-app';

describe('cuentas del personal', () => {
  let context: TestContext;
  let admin: SignedInAccount;

  beforeAll(async () => {
    context = await createTestApp();
    admin = await signInAs(context, 'ADMIN');
  });

  afterAll(async () => {
    await context.app.close();
  });

  it.each([
    ['GET', '/v1/admin/accounts'],
    ['GET', '/v1/admin/facilities'],
    ['GET', '/v1/admin/vaccines'],
    ['GET', '/v1/admin/catalogs?kind=VACCINATION_SCHEDULE'],
    ['GET', '/v1/admin/audit'],
  ] as const)('niega a un digitador %s %s', async (method, url) => {
    const digitizer = await signInAs(context, 'DIGITIZER');

    const response = await request(context, { method, url, token: digitizer.token });

    expect(response.statusCode).toBe(403);
  });

  it('crea un digitador que entra con la contraseña temporal y debe cambiarla', async () => {
    const created = await request(context, {
      method: 'POST',
      url: '/v1/admin/accounts',
      token: admin.token,
      payload: { email: 'Nuevo.Digitador@Prueba.pe', fullName: 'Nuevo Digitador', role: 'DIGITIZER' },
    });
    const body = created.json<StaffAccountCreated>();

    expect(created.statusCode).toBe(201);
    expect(body.account.email).toBe('nuevo.digitador@prueba.pe');

    const firstLogin = await login(context, body.account.email, body.temporaryPassword);
    expect(firstLogin.json<{ step: string }>().step).toBe('PASSWORD_CHANGE_REQUIRED');

    const duplicated = await request(context, {
      method: 'POST',
      url: '/v1/admin/accounts',
      token: admin.token,
      payload: { email: 'nuevo.digitador@prueba.pe', fullName: 'Otro Nombre', role: 'DIGITIZER' },
    });
    expect(duplicated.json<ApiErrorBody>().code).toBe('EMAIL_TAKEN');
  });

  it('corta al instante el acceso de una cuenta suspendida', async () => {
    const digitizer = await signInAs(context, 'DIGITIZER');
    const before = await request(context, { method: 'GET', url: '/v1/auth/me', token: digitizer.token });

    const suspended = await request(context, { method: 'POST', url: `/v1/admin/accounts/${digitizer.id}/suspend`, token: admin.token });
    const afterAccess = await request(context, { method: 'GET', url: '/v1/auth/me', token: digitizer.token });
    const afterRefresh = await request(context, {
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: digitizer.refreshToken },
    });

    expect(before.statusCode).toBe(200);
    expect(suspended.statusCode).toBe(200);
    expect(afterAccess.statusCode).toBe(401);
    expect(afterRefresh.statusCode).toBe(401);
  });

  it('impide que un admin se suspenda a sí mismo', async () => {
    const response = await request(context, { method: 'POST', url: `/v1/admin/accounts/${admin.id}/suspend`, token: admin.token });

    expect(response.json<ApiErrorBody>().code).toBe('CANNOT_CHANGE_OWN_ACCOUNT');
  });

  it('solo asigna establecimientos a digitadores', async () => {
    const facility = await request(context, {
      method: 'POST',
      url: '/v1/admin/facilities',
      token: admin.token,
      payload: { ipressCode: '00099901', name: 'Establecimiento de prueba', healthNetwork: 'Red de prueba', altitudeMeters: 3400 },
    });
    const facilityId = facility.json<{ id: string }>().id;
    const otherAdmin = await createAccount(context, 'ADMIN');
    const digitizer = await createAccount(context, 'DIGITIZER');

    const toAdmin = await request(context, {
      method: 'POST',
      url: `/v1/admin/facilities/${facilityId}/assignments`,
      token: admin.token,
      payload: { accountId: otherAdmin.id },
    });
    const first = await request(context, {
      method: 'POST',
      url: `/v1/admin/facilities/${facilityId}/assignments`,
      token: admin.token,
      payload: { accountId: digitizer.id },
    });
    const repeated = await request(context, {
      method: 'POST',
      url: `/v1/admin/facilities/${facilityId}/assignments`,
      token: admin.token,
      payload: { accountId: digitizer.id },
    });

    expect(toAdmin.json<ApiErrorBody>().code).toBe('ROLE_NOT_ASSIGNABLE');
    expect(first.statusCode).toBe(201);
    expect(repeated.json<ApiErrorBody>().code).toBe('ASSIGNMENT_ALREADY_ACTIVE');
  });
});
