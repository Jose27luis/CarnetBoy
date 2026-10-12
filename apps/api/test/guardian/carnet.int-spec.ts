import type { ApiErrorBody, ChildRecord, GuardianCarnet, GuardianChildCard } from '@carnet/contracts';
import {
  createAccount,
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  randomDni,
  request,
  type SignedInAccount,
  signIn,
  signInDigitizerAt,
  type TestAccount,
  type TestContext,
} from '../support/test-app';

describe('carnet del apoderado', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
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
      payload: { dni: randomDni(), givenNames: 'Lucía', paternalSurname: 'Apaza', maternalSurname: 'Condori', sex: 'FEMALE', birthDate: '2026-03-01' },
    });

    return response.json<ChildRecord>();
  }

  async function linkGuardian(childId: string, account: TestAccount): Promise<string> {
    const guardian = await context.prisma.guardian.create({
      data: { dni: account.identifier, givenNames: 'Rosa', paternalSurname: 'Condori', maternalSurname: 'Quispe', accountId: account.id },
    });
    const link = await context.prisma.guardianLink.create({
      data: {
        childId,
        guardianId: guardian.id,
        relationship: 'MOTHER',
        status: 'ACTIVE',
        consentVersion: '2026-10',
        consentAt: new Date(),
        createdById: digitizer.id,
        facilityId: digitizer.facilityId,
      },
    });

    return link.id;
  }

  async function signInGuardian(): Promise<SignedInAccount> {
    return signIn(context, await createAccount(context, 'GUARDIAN'));
  }

  it('muestra la tarjeta y el carnet del niño vinculado sin nombres del personal', async () => {
    const child = await registerChild();
    const guardian = await signInGuardian();
    await linkGuardian(child.id, guardian);
    await request(context, {
      method: 'POST',
      url: `/v1/children/${child.id}/growth-checks`,
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: { measuredOn: '2026-05-01', weightKg: '5.600', lengthCm: '58.0', position: 'LYING' },
    });

    const cards = await request(context, { method: 'GET', url: '/v1/me/carnet', token: guardian.token });
    const carnet = await request(context, { method: 'GET', url: `/v1/me/carnet/${child.id}`, token: guardian.token });
    const body = carnet.json<GuardianCarnet>();

    expect(cards.json<GuardianChildCard[]>().map((card) => card.id)).toEqual([child.id]);
    expect(carnet.statusCode).toBe(200);
    expect(body.growth).toHaveLength(1);
    expect(body.achievements.map((achievement) => achievement.key)).toContain('first-growth-check');
    expect(body.nextStep.kind).toBeDefined();
    expect(carnet.body).not.toContain('recordedByName');
    expect(carnet.body).not.toContain('canCorrectDirectly');
  });

  it('no deja ver el carnet sin vínculo activo ni a otro rol', async () => {
    const child = await registerChild();
    const owner = await signInGuardian();
    const stranger = await signInGuardian();
    const linkId = await linkGuardian(child.id, owner);

    const foreign = await request(context, { method: 'GET', url: `/v1/me/carnet/${child.id}`, token: stranger.token });
    const asDigitizer = await request(context, { method: 'GET', url: `/v1/me/carnet/${child.id}`, token: digitizer.token });
    await context.prisma.guardianLink.update({
      where: { id: linkId },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedById: digitizer.id, revocationReason: 'Prueba', revocationDocument: 'Oficio 1' },
    });
    const revoked = await request(context, { method: 'GET', url: `/v1/me/carnet/${child.id}`, token: owner.token });

    expect(foreign.statusCode).toBe(404);
    expect(foreign.json<ApiErrorBody>().code).toBe('NOT_FOUND');
    expect(asDigitizer.statusCode).toBe(403);
    expect(revoked.statusCode).toBe(404);
  });
});
