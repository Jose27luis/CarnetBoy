import type { ApiErrorBody, LoginStep, TotpEnrollment } from '@carnet/contracts';
import { generateSync } from 'otplib';
import {
  createAccount,
  createTestApp,
  login,
  request,
  signIn,
  TEST_PASSWORD,
  type TestContext,
  totpCode,
} from '../support/test-app';

describe('ingreso', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('exige el segundo factor a un admin antes de abrir la sesión', async () => {
    const admin = await createAccount(context, 'ADMIN');

    const response = await login(context, admin.email);

    expect(response.statusCode).toBe(200);
    expect(response.json<LoginStep>().step).toBe('TOTP_REQUIRED');
    expect(response.json<Record<string, unknown>>()).not.toHaveProperty('tokens');
  });

  it('abre la sesión del admin con un código válido y rechaza reutilizarlo', async () => {
    const admin = await createAccount(context, 'ADMIN');
    const code = totpCode(admin.totpSecret);
    const first = (await login(context, admin.email)).json<LoginStep>();
    const second = (await login(context, admin.email)).json<LoginStep>();

    if (first.step !== 'TOTP_REQUIRED' || second.step !== 'TOTP_REQUIRED') {
      throw new Error('Se esperaba el paso del segundo factor');
    }

    const accepted = await request(context, {
      method: 'POST',
      url: '/v1/auth/totp/verify',
      payload: { challengeToken: first.challengeToken, code },
    });
    const replayed = await request(context, {
      method: 'POST',
      url: '/v1/auth/totp/verify',
      payload: { challengeToken: second.challengeToken, code },
    });

    expect(accepted.json<LoginStep>().step).toBe('AUTHENTICATED');
    expect(replayed.statusCode).toBe(401);
    expect(replayed.json<ApiErrorBody>().code).toBe('INVALID_TOTP_CODE');
  });

  it('bloquea la cuenta al quinto intento fallido aunque luego llegue la contraseña correcta', async () => {
    const digitizer = await createAccount(context, 'DIGITIZER');

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const failed = await login(context, digitizer.email, 'contraseña-equivocada');
      expect(failed.json<ApiErrorBody>().code).toBe('INVALID_CREDENTIALS');
    }

    const blocked = await login(context, digitizer.email, TEST_PASSWORD);

    expect(blocked.statusCode).toBe(423);
    expect(blocked.json<ApiErrorBody>().code).toBe('ACCOUNT_LOCKED');
  });

  it('responde igual a un correo inexistente que a una contraseña equivocada', async () => {
    const response = await login(context, 'nadie@prueba.pe', 'cualquier-cosa');

    expect(response.statusCode).toBe(401);
    expect(response.json<ApiErrorBody>().code).toBe('INVALID_CREDENTIALS');
  });

  it('lleva a una cuenta nueva por el cambio de contraseña y el enrolamiento del segundo factor', async () => {
    const digitizer = await createAccount(context, 'DIGITIZER', { passwordChangeRequired: true, totpEnrolled: false });
    const first = (await login(context, digitizer.email)).json<LoginStep>();

    if (first.step !== 'PASSWORD_CHANGE_REQUIRED') {
      throw new Error(`Se esperaba el cambio de contraseña y llegó ${first.step}`);
    }

    const reused = await request(context, {
      method: 'POST',
      url: '/v1/auth/password/initial',
      payload: { challengeToken: first.challengeToken, newPassword: TEST_PASSWORD },
    });
    expect(reused.json<ApiErrorBody>().code).toBe('PASSWORD_REUSED');

    const changed = (
      await request(context, {
        method: 'POST',
        url: '/v1/auth/password/initial',
        payload: { challengeToken: first.challengeToken, newPassword: 'una-clave-nueva-y-larga' },
      })
    ).json<LoginStep>();

    if (changed.step !== 'TOTP_ENROLLMENT_REQUIRED') {
      throw new Error(`Se esperaba el enrolamiento y llegó ${changed.step}`);
    }

    const enrollment = (
      await request(context, { method: 'POST', url: '/v1/auth/totp/enrollment', payload: { challengeToken: changed.challengeToken } })
    ).json<TotpEnrollment>();
    expect(enrollment.qrSvg).toContain('<svg');

    const verified = await request(context, {
      method: 'POST',
      url: '/v1/auth/totp/verify',
      payload: { challengeToken: changed.challengeToken, code: generateSync({ secret: enrollment.secret }) },
    });

    expect(verified.json<LoginStep>().step).toBe('AUTHENTICATED');

    const nextLogin = await login(context, digitizer.email, 'una-clave-nueva-y-larga');
    expect(nextLogin.json<LoginStep>().step).toBe('TOTP_REQUIRED');
  });

  it('no acepta el token de un paso del ingreso como token de acceso', async () => {
    const admin = await createAccount(context, 'ADMIN');
    const step = (await login(context, admin.email)).json<LoginStep>();

    if (step.step !== 'TOTP_REQUIRED') {
      throw new Error('Se esperaba el paso del segundo factor');
    }

    const response = await request(context, { method: 'GET', url: '/v1/auth/me', token: step.challengeToken });

    expect(response.statusCode).toBe(401);
  });

  it('devuelve la cuenta de la sesión', async () => {
    const admin = await signIn(context, await createAccount(context, 'ADMIN'));

    const response = await request(context, { method: 'GET', url: '/v1/auth/me', token: admin.token });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ email: string; role: string }>()).toMatchObject({ email: admin.email, role: 'ADMIN' });
  });
});
