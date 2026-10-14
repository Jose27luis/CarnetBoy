import { lmsAt } from '@carnet/clinical';
import type {
  AdministeredDoseRecord,
  AnemiaOverview,
  ApiErrorBody,
  CatalogVersionDetail,
  ChildRecord,
  CorrectionOutcome,
  CorrectionRequestItem,
  GrowthBands,
  GrowthCheckRecord,
  HemoglobinTestRecord,
  ImmunizationStatus,
  IronSupplyRecord,
} from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import {
  createAccount,
  createFacility,
  createTestApp,
  type FieldDigitizer,
  idempotencyKey,
  randomDni,
  request,
  type SignedInAccount,
  signInAs,
  signInDigitizerAt,
  type TestContext,
} from '../support/test-app';

const CLOSED_FROM = new Date('2020-01-01T00:00:00Z');
const CLOSED_TO = new Date('2026-06-01T00:00:00Z');

const NTS_213_ALTITUDES: [number, number, string][] = [
  [0, 499, '0'],
  [500, 999, '0.4'],
  [1000, 1499, '0.8'],
  [1500, 1999, '1.1'],
  [2000, 2499, '1.4'],
  [2500, 2999, '1.8'],
  [3000, 3499, '2.1'],
  [3500, 3999, '2.5'],
  [4000, 4499, '2.9'],
  [4500, 4999, '3.3'],
];

describe('registros clínicos del digitador', () => {
  let context: TestContext;
  let digitizer: FieldDigitizer;
  let colleague: FieldDigitizer;
  let admin: SignedInAccount;
  let firstDoseId: string;
  let secondDoseId: string;

  beforeAll(async () => {
    context = await createTestApp();
    digitizer = await signInDigitizerAt(context);
    colleague = await signInDigitizerAt(context, digitizer.facilityId);
    admin = await signInAs(context, 'ADMIN');
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function registerChild(birthDate: string, options: { sex?: 'FEMALE' | 'MALE'; gestationalWeeks?: number } = {}): Promise<ChildRecord> {
    const response = await request(context, {
      method: 'POST',
      url: '/v1/children',
      token: digitizer.token,
      headers: { ...digitizer.headers, 'idempotency-key': idempotencyKey() },
      payload: {
        dni: randomDni(),
        givenNames: 'Valentina',
        paternalSurname: 'Quispe',
        maternalSurname: 'Mamani',
        sex: options.sex ?? 'FEMALE',
        birthDate,
        ...(options.gestationalWeeks === undefined ? {} : { gestationalWeeks: options.gestationalWeeks }),
      },
    });

    return response.json<ChildRecord>();
  }

  function post(account: FieldDigitizer, url: string, payload: Record<string, unknown>, key: string = idempotencyKey()): ReturnType<typeof request> {
    return request(context, { method: 'POST', url, token: account.token, headers: { ...account.headers, 'idempotency-key': key }, payload });
  }

  async function publishClosedSchedule(): Promise<void> {
    const creator = await createAccount(context, 'ADMIN');
    const first = await context.prisma.vaccine.create({ data: { code: `PRB-${randomDni()}`, name: 'Vacuna de prueba A', prevents: 'Enfermedad ficticia' } });
    const version = await context.prisma.catalogVersion.create({
      data: {
        kind: 'VACCINATION_SCHEDULE',
        norm: 'Esquema cerrado de prueba',
        createdById: creator.id,
        scheduledDoses: {
          create: [
            { vaccineId: first.id, doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 365 },
            { vaccineId: first.id, doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 180 },
          ],
        },
      },
      include: { scheduledDoses: { orderBy: { doseNumber: 'asc' } } },
    });
    await context.prisma.catalogVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', validFrom: CLOSED_FROM, validTo: CLOSED_TO, publishedAt: new Date() },
    });
    [firstDoseId, secondDoseId] = version.scheduledDoses.map((dose) => dose.id) as [string, string];
  }

  async function publishClosedThresholds(): Promise<void> {
    const creator = await createAccount(context, 'ADMIN');
    const version = await context.prisma.catalogVersion.create({
      data: {
        kind: 'HEMOGLOBIN_THRESHOLDS',
        norm: 'Umbrales cerrados de prueba',
        createdById: creator.id,
        hemoglobinThresholds: {
          create: [
            { minAgeMonths: 6, maxAgeMonths: 23, normalFrom: new Prisma.Decimal('10.5'), mildFrom: new Prisma.Decimal('9.5'), moderateFrom: new Prisma.Decimal('7.0') },
            { minAgeMonths: 24, maxAgeMonths: 59, normalFrom: new Prisma.Decimal('11.0'), mildFrom: new Prisma.Decimal('10.0'), moderateFrom: new Prisma.Decimal('7.0') },
          ],
        },
        altitudeAdjustments: {
          create: NTS_213_ALTITUDES.map(([minAltitude, maxAltitude, subtract]) => ({ minAltitude, maxAltitude, subtract: new Prisma.Decimal(subtract) })),
        },
      },
    });
    await context.prisma.catalogVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', validFrom: CLOSED_FROM, validTo: CLOSED_TO, publishedAt: new Date() },
    });
  }

  describe('vacunación', () => {
    it('sin esquema publicado para la fecha de nacimiento responde SCHEDULE_NOT_PUBLISHED', async () => {
      const child = await registerChild('2026-08-01');
      const status = await request(context, { method: 'GET', url: `/v1/children/${child.id}/immunization`, token: digitizer.token, headers: digitizer.headers });
      const recorded = await post(digitizer, `/v1/children/${child.id}/doses`, {
        scheduledDoseId: '00000000-0000-4000-8000-000000000000',
        administeredOn: '2026-09-01',
        lot: 'L1',
      });

      expect(status.json<ImmunizationStatus>().schedule).toBeNull();
      expect(recorded.statusCode).toBe(422);
      expect(recorded.json<ApiErrorBody>().code).toBe('SCHEDULE_NOT_PUBLISHED');
    });

    it('registra la dosis, la marca aplicada y rechaza el duplicado y la dosis fuera de rango sin motivo', async () => {
      await publishClosedSchedule();
      const child = await registerChild('2026-05-01');
      const url = `/v1/children/${child.id}/immunization`;

      const before = (await request(context, { method: 'GET', url, token: digitizer.token, headers: digitizer.headers })).json<ImmunizationStatus>();
      const applied = await post(digitizer, `/v1/children/${child.id}/doses`, { scheduledDoseId: firstDoseId, administeredOn: '2026-07-01', lot: 'j4521' });
      const duplicated = await post(digitizer, `/v1/children/${child.id}/doses`, { scheduledDoseId: firstDoseId, administeredOn: '2026-07-02', lot: 'J4521' });
      const outOfRange = await post(digitizer, `/v1/children/${child.id}/doses`, { scheduledDoseId: secondDoseId, administeredOn: '2026-05-20', lot: 'K1' });
      const justified = await post(digitizer, `/v1/children/${child.id}/doses`, {
        scheduledDoseId: secondDoseId,
        administeredOn: '2026-05-20',
        lot: 'K1',
        outOfRangeReason: 'Campaña de vacunación con indicación médica',
      });
      const after = (await request(context, { method: 'GET', url, token: digitizer.token, headers: digitizer.headers })).json<ImmunizationStatus>();

      expect(before.doses[0]?.status).not.toBe('APPLIED');
      expect(applied.statusCode).toBe(201);
      expect(applied.json<AdministeredDoseRecord>().lot).toBe('J4521');
      expect(duplicated.statusCode).toBe(409);
      expect(duplicated.json<ApiErrorBody>().code).toBe('DOSE_ALREADY_RECORDED');
      expect(outOfRange.statusCode).toBe(422);
      expect(outOfRange.json<ApiErrorBody>().code).toBe('DOSE_OUT_OF_RANGE');
      expect(justified.statusCode).toBe(201);
      expect(after.doses.map((dose) => dose.status)).toEqual(['APPLIED', 'APPLIED']);
      expect(after.recentLots[after.doses[0]?.vaccineId ?? '']).toEqual(expect.arrayContaining(['J4521', 'K1']));
    });
  });

  describe('crecimiento', () => {
    it('usa la edad corregida del prematuro y da z cercano a 0 con la mediana de la OMS', async () => {
      const child = await registerChild('2026-01-10', { gestationalWeeks: 32 });
      const weight = lmsAt('WEIGHT_FOR_AGE', 'FEMALE', 34);
      const length = lmsAt('LENGTH_FOR_AGE', 'FEMALE', 34);

      const response = await post(digitizer, `/v1/children/${child.id}/growth-checks`, {
        measuredOn: '2026-04-10',
        weightKg: weight?.m.toFixed(3),
        lengthCm: length?.m.toFixed(1),
        position: 'LYING',
      });
      const check = response.json<GrowthCheckRecord>();

      expect(response.statusCode).toBe(201);
      expect(check.ageDays).toBe(90);
      expect(check.correctedAgeDays).toBe(34);
      expect(Math.abs(Number(check.zWeightForAge))).toBeLessThanOrEqual(0.02);
      expect(Math.abs(Number(check.zLengthForAge))).toBeLessThanOrEqual(0.05);
      expect(check.weightForAge).toBe('NORMAL');
      expect(check.referenceVersion).toBe('OMS 2006');
    });

    it('entrega las bandas de la OMS del niño con siete líneas de desvío', async () => {
      const child = await registerChild('2026-02-01', { sex: 'MALE' });
      const response = await request(context, { method: 'GET', url: `/v1/children/${child.id}/growth-checks/bands`, token: digitizer.token, headers: digitizer.headers });
      const bands = response.json<GrowthBands>();

      expect(response.statusCode).toBe(200);
      expect(bands.weightForAge[0]?.x).toBe(0);
      expect(bands.lengthForAge[0]?.values).toHaveLength(7);
      expect(bands.headForAge.at(-1)?.x).toBeGreaterThanOrEqual(358);
    });

    it('pide confirmar un cambio de peso mayor al 30 %', async () => {
      const child = await registerChild('2026-02-01');
      const url = `/v1/children/${child.id}/growth-checks`;

      await post(digitizer, url, { measuredOn: '2026-03-01', weightKg: '4.200', lengthCm: '54.0', position: 'LYING' });
      const suspicious = await post(digitizer, url, { measuredOn: '2026-04-01', weightKg: '6.200', lengthCm: '57.0', position: 'LYING' });
      const confirmed = await post(digitizer, url, { measuredOn: '2026-04-01', weightKg: '6.200', lengthCm: '57.0', position: 'LYING', confirmed: true });

      expect(suspicious.statusCode).toBe(422);
      expect(suspicious.json<ApiErrorBody>().code).toBe('MEASUREMENT_NEEDS_CONFIRMATION');
      expect(confirmed.statusCode).toBe(201);
    });
  });

  describe('hemoglobina', () => {
    it('ajusta por la altitud del establecimiento elegido y clasifica según la edad', async () => {
      await publishClosedThresholds();
      const highland = await createFacility(context, 3400);
      await context.prisma.facilityAssignment.create({ data: { accountId: digitizer.id, facilityId: highland, grantedById: admin.id } });
      const atHighland: FieldDigitizer = { ...digitizer, facilityId: highland, headers: { 'x-facility-id': highland } };
      const child = await registerChild('2025-01-15');

      const high = await post(atHighland, `/v1/children/${child.id}/hemoglobin-tests`, { testedOn: '2026-03-10', observed: '12.0' });
      const low = await post(digitizer, `/v1/children/${child.id}/hemoglobin-tests`, { testedOn: '2026-03-12', observed: '12.0' });
      const overview = await request(context, { method: 'GET', url: `/v1/children/${child.id}/anemia`, token: atHighland.token, headers: atHighland.headers });

      expect(high.statusCode).toBe(201);
      expect(high.json<HemoglobinTestRecord>()).toMatchObject({ altitudeMeters: 3400, adjustment: '2.1', adjusted: '9.9', ageMonths: 13, classification: 'MILD' });
      expect(low.json<HemoglobinTestRecord>()).toMatchObject({ altitudeMeters: 150, adjustment: '0.0', adjusted: '12.0', classification: 'NONE' });
      expect(overview.json<AnemiaOverview>()).toMatchObject({ facilityAltitude: 3400 });
      expect(overview.json<AnemiaOverview>().tests).toHaveLength(2);
    });

    it('sin umbrales publicados para la fecha responde THRESHOLDS_NOT_PUBLISHED', async () => {
      const child = await registerChild('2026-07-01');
      const response = await post(digitizer, `/v1/children/${child.id}/hemoglobin-tests`, { testedOn: '2026-08-01', observed: '11.0' });

      expect(response.statusCode).toBe(422);
      expect(response.json<ApiErrorBody>().code).toBe('THRESHOLDS_NOT_PUBLISHED');
    });

    it('no publica umbrales sin la tabla de altitud completa', async () => {
      const draft = (
        await request(context, {
          method: 'POST',
          url: '/v1/admin/catalogs',
          token: admin.token,
          headers: { 'idempotency-key': idempotencyKey() },
          payload: { kind: 'HEMOGLOBIN_THRESHOLDS', norm: 'Borrador sin altitud' },
        })
      ).json<CatalogVersionDetail>();
      const withThreshold = (
        await request(context, {
          method: 'POST',
          url: `/v1/admin/catalogs/${draft.id}/hemoglobin-thresholds`,
          token: admin.token,
          payload: { minAgeMonths: 6, maxAgeMonths: 23, normalFrom: '10.5', mildFrom: '9.5', moderateFrom: '7.0', expectedVersion: draft.version },
        })
      ).json<CatalogVersionDetail>();
      const empty = await request(context, {
        method: 'POST',
        url: `/v1/admin/catalogs/${draft.id}/publish`,
        token: admin.token,
        payload: { validFrom: '2031-01-01', expectedVersion: withThreshold.version },
      });
      const partial = (
        await request(context, {
          method: 'POST',
          url: `/v1/admin/catalogs/${draft.id}/altitude-adjustments`,
          token: admin.token,
          payload: { minAltitude: 0, maxAltitude: 499, subtract: '0', expectedVersion: withThreshold.version },
        })
      ).json<CatalogVersionDetail>();
      const incomplete = await request(context, {
        method: 'POST',
        url: `/v1/admin/catalogs/${draft.id}/publish`,
        token: admin.token,
        payload: { validFrom: '2031-01-01', expectedVersion: partial.version },
      });

      expect(empty.statusCode).toBe(422);
      expect(empty.json<ApiErrorBody>().code).toBe('CATALOG_EMPTY');
      expect(partial.altitudeAdjustments).toHaveLength(1);
      expect(incomplete.statusCode).toBe(422);
      expect(incomplete.json<ApiErrorBody>().code).toBe('ALTITUDE_TABLE_INCOMPLETE');
    });
  });

  describe('correcciones', () => {
    async function supply(child: ChildRecord, account: FieldDigitizer = digitizer): Promise<IronSupplyRecord> {
      return (
        await post(account, `/v1/children/${child.id}/iron-supplies`, {
          suppliedOn: '2026-08-01',
          product: 'DROPS',
          doseInstructions: '2 gotas por kg al día',
          quantity: 1,
          purpose: 'PREVENTION',
        })
      ).json<IronSupplyRecord>();
    }

    function correct(account: FieldDigitizer, recordId: string, quantity: number): ReturnType<typeof request> {
      return request(context, {
        method: 'POST',
        url: `/v1/records/IRON_SUPPLY/${recordId}/corrections`,
        token: account.token,
        payload: {
          fields: { suppliedOn: '2026-08-01', product: 'DROPS', doseInstructions: '2 gotas por kg al día', quantity, purpose: 'PREVENTION' },
          reason: 'Se entregaron más frascos',
        },
      });
    }

    function currentSupplies(childId: string): Promise<number> {
      return context.prisma.ironSupply.count({ where: { childId, isCurrent: true } });
    }

    it('aplica de inmediato la corrección propia dentro de las 72 horas', async () => {
      const child = await registerChild('2026-03-01');
      const original = await supply(child);

      const response = await correct(digitizer, original.id, 2);
      const again = await correct(digitizer, original.id, 3);

      expect(response.json<CorrectionOutcome>()).toEqual({ applied: true });
      expect(again.statusCode).toBe(409);
      expect(again.json<ApiErrorBody>().code).toBe('RECORD_NOT_CURRENT');
      expect(await currentSupplies(child.id)).toBe(1);
      expect(await context.prisma.ironSupply.findFirst({ where: { childId: child.id, isCurrent: true } })).toMatchObject({ quantity: 2, version: 2, replacesId: original.id });
    });

    it('deja pendiente la corrección ajena o vieja y la aplica al aprobarla', async () => {
      const child = await registerChild('2026-03-01');
      const foreign = await supply(child);
      const old = await supply(child);
      await context.prisma.ironSupply.update({ where: { id: old.id }, data: { recordedAt: new Date(Date.now() - 73 * 60 * 60 * 1000) } });

      const foreignRequest = await correct(colleague, foreign.id, 4);
      const repeated = await correct(colleague, foreign.id, 5);
      const oldRequest = await correct(digitizer, old.id, 6);
      const pending = (await request(context, { method: 'GET', url: '/v1/admin/corrections', token: admin.token })).json<CorrectionRequestItem[]>();
      const target = pending.find((item) => item.recordId === foreign.id);
      const approved = await request(context, { method: 'POST', url: `/v1/admin/corrections/${target?.id}/approve`, token: admin.token });
      const approvedTwice = await request(context, { method: 'POST', url: `/v1/admin/corrections/${target?.id}/approve`, token: admin.token });

      expect(foreignRequest.json<CorrectionOutcome>()).toEqual({ applied: false });
      expect(repeated.json<ApiErrorBody>().code).toBe('CORRECTION_ALREADY_REQUESTED');
      expect(oldRequest.json<CorrectionOutcome>()).toEqual({ applied: false });
      expect(target).toMatchObject({ before: { quantity: 1 }, proposed: { quantity: 4 } });
      expect(approved.statusCode).toBe(204);
      expect(approvedTwice.json<ApiErrorBody>().code).toBe('CORRECTION_NOT_PENDING');
      expect(await context.prisma.ironSupply.findUnique({ where: { id: foreign.id } })).toMatchObject({ isCurrent: false });
      expect(await context.prisma.ironSupply.findFirst({ where: { replacesId: foreign.id } })).toMatchObject({ quantity: 4, isCurrent: true, recordedById: colleague.id });
    });

    it('mantiene vigente el original al rechazar la corrección', async () => {
      const child = await registerChild('2026-03-01');
      const original = await supply(child);

      await correct(colleague, original.id, 7);
      const pending = (await request(context, { method: 'GET', url: `/v1/children/${child.id}/corrections`, token: digitizer.token })).json<{ id: string }[]>();
      const rejected = await request(context, {
        method: 'POST',
        url: `/v1/admin/corrections/${pending[0]?.id}/reject`,
        token: admin.token,
        payload: { reason: 'Coincide con la historia clínica' },
      });

      expect(pending).toHaveLength(1);
      expect(rejected.statusCode).toBe(204);
      expect(await context.prisma.ironSupply.findUnique({ where: { id: original.id } })).toMatchObject({ isCurrent: true, quantity: 1 });
      expect(await currentSupplies(child.id)).toBe(1);
    });
  });

  it('dos registros simultáneos con la misma Idempotency-Key crean uno solo', async () => {
    const child = await registerChild('2026-03-01');
    const key = idempotencyKey();
    const payload = { suppliedOn: '2026-08-02', product: 'SYRUP', doseInstructions: '5 ml al día', quantity: 1, purpose: 'TREATMENT' };

    const [first, second] = await Promise.all([
      post(digitizer, `/v1/children/${child.id}/iron-supplies`, payload, key),
      post(digitizer, `/v1/children/${child.id}/iron-supplies`, payload, key),
    ]);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json<IronSupplyRecord>().id).toBe(second.json<IronSupplyRecord>().id);
    expect(await context.prisma.ironSupply.count({ where: { childId: child.id } })).toBe(1);
  });
});
