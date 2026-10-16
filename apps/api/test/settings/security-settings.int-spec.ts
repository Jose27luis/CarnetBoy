import type { ApiErrorBody, LoginStep, SecuritySettings } from '@carnet/contracts';
import { createAccount, createTestApp, login, request, type SignedInAccount, signInAs, type TestContext } from '../support/test-app';

describe('configuración de seguridad', () => {
  let context: TestContext;
  let admin: SignedInAccount;

  beforeAll(async () => {
    context = await createTestApp({ TOTP_REQUIRED: false, STAFF_PASSWORD_CHANGE: false });
    admin = await signInAs(context, 'ADMIN');
  });

  afterAll(async () => {
    await context.prisma.securitySetting.deleteMany();
    await context.app.close();
  });

  function save(payload: Record<string, unknown>): ReturnType<typeof request> {
    return request(context, { method: 'PUT', url: '/v1/admin/settings/security', token: admin.token, payload });
  }

  it('parte de los valores del servidor y el ingreso obedece lo que guarda el admin', async () => {
    const digitizer = await createAccount(context, 'DIGITIZER', { passwordChangeRequired: true, totpEnrolled: false });

    const initial = await request(context, { method: 'GET', url: '/v1/admin/settings/security', token: admin.token });
    const before = await login(context, digitizer.identifier);
    const saved = await save({ totpRequired: false, staffPasswordChange: true, expectedVersion: 0 });
    const after = await login(context, digitizer.identifier);
    const stale = await save({ totpRequired: true, staffPasswordChange: true, expectedVersion: 0 });
    const forbidden = await request(context, {
      method: 'PUT',
      url: '/v1/admin/settings/security',
      token: (await signInAs(context, 'DIGITIZER')).token,
      payload: { totpRequired: false, staffPasswordChange: false, expectedVersion: 1 },
    });

    expect(initial.json<SecuritySettings>()).toMatchObject({ totpRequired: false, staffPasswordChange: false, version: 0, updatedAt: null });
    expect(before.json<LoginStep>().step).toBe('AUTHENTICATED');
    expect(saved.json<SecuritySettings>()).toMatchObject({ staffPasswordChange: true, version: 1 });
    expect(after.json<LoginStep>().step).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(stale.json<ApiErrorBody>().code).toBe('VERSION_CONFLICT');
    expect(forbidden.statusCode).toBe(403);
  });
});
