import type { ActivationChallenge, ActivationCodeIssued, AdminLinkItem, ApiErrorBody, ChildRecord, LinkCreated, LoginStep } from '@carnet/contracts';
import { CONSENT_VERSION } from '@carnet/contracts';
import {
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  login,
  randomDni,
  request,
  type SignedInAccount,
  signInAs,
  signInDigitizerAt,
  type TestContext,
} from '../support/test-app';

const GUARDIAN_PASSWORD = 'mi-clave-segura';

describe('activación del apoderado y revocación', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;
  let admin: SignedInAccount;

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
    admin = await signInAs(context, 'ADMIN');
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function pendingLink(): Promise<{ guardianDni: string; code: string; linkId: string; childId: string }> {
    const child = (
      await request(context, {
        method: 'POST',
        url: '/v1/children',
        token: digitizer.token,
        headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
        payload: { dni: randomDni(), givenNames: 'Mateo', paternalSurname: 'Flores', maternalSurname: 'Ríos', sex: 'MALE', birthDate: '2025-11-02' },
      })
    ).json<ChildRecord>();
    const guardianDni = randomDni();
    const created = (
      await request(context, {
        method: 'POST',
        url: `/v1/children/${child.id}/links`,
        token: digitizer.token,
        headers: digitizer.headers,
        payload: {
          guardianDni,
          guardian: { givenNames: 'Ana', paternalSurname: 'Ríos', maternalSurname: 'Paz' },
          relationship: 'MOTHER',
          consentAccepted: true,
          consentVersion: CONSENT_VERSION,
        },
      })
    ).json<LinkCreated>();

    return { guardianDni, code: created.activationCode ?? '', linkId: created.link.id, childId: child.id };
  }

  function verify(dni: string, code: string): ReturnType<typeof request> {
    return request(context, { method: 'POST', url: '/v1/activation/verify', payload: { dni, code } });
  }

  function complete(challengeToken: string): ReturnType<typeof request> {
    return request(context, { method: 'POST', url: '/v1/activation/complete', payload: { challengeToken, password: GUARDIAN_PASSWORD } });
  }

  it('crea la cuenta, activa el vínculo y permite ingresar con DNI sin segundo factor', async () => {
    const pending = await pendingLink();

    const verified = await verify(pending.guardianDni, pending.code.toLowerCase());
    const challenge = verified.json<ActivationChallenge>();
    const completed = await complete(challenge.challengeToken);
    const loginStep = (await login(context, pending.guardianDni, GUARDIAN_PASSWORD)).json<LoginStep>();
    const link = await context.prisma.guardianLink.findUniqueOrThrow({ where: { id: pending.linkId } });

    expect(challenge.children).toHaveLength(1);
    expect(completed.json<LoginStep>().step).toBe('AUTHENTICATED');
    expect(link.status).toBe('ACTIVE');
    expect(loginStep.step).toBe('AUTHENTICATED');

    if (loginStep.step === 'AUTHENTICATED') {
      const children = await request(context, { method: 'GET', url: '/v1/me/children', token: loginStep.tokens.accessToken });
      expect(children.json<{ id: string }[]>().map((child) => child.id)).toEqual([pending.childId]);
    }
  });

  it('solo una de dos activaciones simultáneas con el mismo código crea la cuenta', async () => {
    const pending = await pendingLink();
    const first = (await verify(pending.guardianDni, pending.code)).json<ActivationChallenge>();
    const second = (await verify(pending.guardianDni, pending.code)).json<ActivationChallenge>();

    const results = await Promise.all([complete(first.challengeToken), complete(second.challengeToken)]);
    const accounts = await context.prisma.account.count({ where: { dni: pending.guardianDni } });

    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 401]);
    expect(accounts).toBe(1);
  });

  it('invalida el código anterior al reemitirlo', async () => {
    const pending = await pendingLink();

    const reissued = (
      await request(context, { method: 'POST', url: `/v1/links/${pending.linkId}/reissue`, token: digitizer.token, headers: digitizer.headers })
    ).json<ActivationCodeIssued>();
    const old = await verify(pending.guardianDni, pending.code);
    const fresh = await verify(pending.guardianDni, reissued.activationCode);

    expect(old.json<ApiErrorBody>().code).toBe('ACTIVATION_INVALID');
    expect(fresh.statusCode).toBe(200);
  });

  it('no acepta un código vencido', async () => {
    const pending = await pendingLink();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await context.prisma.activationCode.updateMany({
      where: { linkId: pending.linkId },
      data: { createdAt: eightDaysAgo, expiresAt: new Date(eightDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000) },
    });

    const response = await verify(pending.guardianDni, pending.code);

    expect(response.json<ApiErrorBody>().code).toBe('ACTIVATION_INVALID');
  });

  it('bloquea el DNI tras cinco intentos fallidos aunque luego llegue el código correcto', async () => {
    const pending = await pendingLink();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await verify(pending.guardianDni, 'ZZZZZZZZ')).json<ApiErrorBody>().code).toBe('ACTIVATION_INVALID');
    }

    const blocked = await verify(pending.guardianDni, pending.code);

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>().code).toBe('ACTIVATION_LOCKED');
  });

  it('al revocar el último vínculo activo cierra las sesiones del apoderado', async () => {
    const pending = await pendingLink();
    const challenge = (await verify(pending.guardianDni, pending.code)).json<ActivationChallenge>();
    const session = (await complete(challenge.challengeToken)).json<LoginStep>();

    if (session.step !== 'AUTHENTICATED') {
      throw new Error('La activación debía abrir la sesión');
    }

    const found = (await request(context, { method: 'GET', url: `/v1/admin/links?document=${pending.guardianDni}`, token: admin.token })).json<
      AdminLinkItem[]
    >();
    const revoked = await request(context, {
      method: 'POST',
      url: `/v1/admin/links/${pending.linkId}/revoke`,
      token: admin.token,
      payload: { reason: 'Orden judicial de prueba', document: 'Expediente 0001-2026', expectedVersion: found[0]?.version ?? 0 },
    });
    const refresh = await request(context, { method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: session.tokens.refreshToken } });
    const children = await request(context, { method: 'GET', url: '/v1/me/children', token: session.tokens.accessToken });

    expect(found).toHaveLength(1);
    expect(revoked.statusCode).toBe(204);
    expect(refresh.statusCode).toBe(401);
    expect(children.json<unknown[]>()).toEqual([]);
  });
});
