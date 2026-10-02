import { randomUUID } from 'node:crypto';
import type { ApiErrorBody, CatalogVersion, CatalogVersionDetail, Vaccine } from '@carnet/contracts';
import { createTestApp, request, type SignedInAccount, signInAs, type TestContext } from '../support/test-app';

describe('catálogos versionados', () => {
  let context: TestContext;
  let admin: SignedInAccount;
  let vaccine: Vaccine;

  beforeAll(async () => {
    context = await createTestApp();
    admin = await signInAs(context, 'ADMIN');
    vaccine = (
      await request(context, {
        method: 'POST',
        url: '/v1/admin/vaccines',
        token: admin.token,
        payload: { code: 'PRUEBA1', name: 'Vacuna de prueba', prevents: 'Enfermedad ficticia' },
      })
    ).json<Vaccine>();
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function createDraft(key: string = randomUUID().replaceAll('-', '')): Promise<CatalogVersionDetail> {
    const response = await request(context, {
      method: 'POST',
      url: '/v1/admin/catalogs',
      token: admin.token,
      headers: { 'idempotency-key': key },
      payload: { kind: 'VACCINATION_SCHEDULE', norm: 'Norma ficticia de prueba' },
    });

    return response.json<CatalogVersionDetail>();
  }

  async function addDose(draft: CatalogVersionDetail): Promise<CatalogVersionDetail> {
    return (
      await request(context, {
        method: 'POST',
        url: `/v1/admin/catalogs/${draft.id}/doses`,
        token: admin.token,
        payload: { vaccineId: vaccine.id, doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 365, expectedVersion: draft.version },
      })
    ).json<CatalogVersionDetail>();
  }

  async function publish(version: CatalogVersionDetail, validFrom: string): Promise<ReturnType<typeof request>> {
    return request(context, {
      method: 'POST',
      url: `/v1/admin/catalogs/${version.id}/publish`,
      token: admin.token,
      payload: { validFrom, expectedVersion: version.version },
    });
  }

  it('no duplica el borrador cuando llega dos veces la misma Idempotency-Key', async () => {
    const key = randomUUID().replaceAll('-', '');

    const [first, second] = await Promise.all([createDraft(key), createDraft(key)]);

    expect(first.id).toBe(second.id);
  });

  it('no publica un borrador sin entradas', async () => {
    const draft = await createDraft();

    const response = await publish(draft, '2026-01-01');

    expect(response.json<ApiErrorBody>().code).toBe('CATALOG_EMPTY');
  });

  it('cierra la vigencia de la versión anterior al publicar una nueva', async () => {
    const first = await addDose(await createDraft());
    expect((await publish(first, '2027-01-01')).statusCode).toBe(200);

    const tooEarly = await addDose(await createDraft());
    const rejected = await publish(tooEarly, '2027-01-01');
    expect(rejected.json<ApiErrorBody>().code).toBe('VALIDITY_NOT_AFTER_CURRENT');

    const second = await addDose(await createDraft());
    const published = await publish(second, '2027-06-01');
    expect(published.statusCode).toBe(200);

    const versions = (
      await request(context, { method: 'GET', url: '/v1/admin/catalogs?kind=VACCINATION_SCHEDULE', token: admin.token })
    ).json<CatalogVersion[]>();

    expect(versions.find((version) => version.id === first.id)?.validTo).toBe('2027-06-01');
    expect(versions.find((version) => version.id === second.id)?.validTo).toBeNull();
  });

  it('no modifica una versión publicada, ni por la API ni directo en la base', async () => {
    const draft = await addDose(await createDraft());
    const published = (await publish(draft, '2028-01-01')).json<CatalogVersionDetail>();

    const response = await request(context, {
      method: 'POST',
      url: `/v1/admin/catalogs/${published.id}/doses`,
      token: admin.token,
      payload: { vaccineId: vaccine.id, doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 365, expectedVersion: published.version },
    });
    expect(response.json<ApiErrorBody>().code).toBe('CATALOG_NOT_DRAFT');

    await expect(context.prisma.scheduledDose.deleteMany({ where: { catalogVersionId: published.id } })).rejects.toThrow(
      /versión publicada/,
    );
  });

  it('rechaza editar con una versión desactualizada', async () => {
    const draft = await createDraft();
    await addDose(draft);

    const stale = await request(context, {
      method: 'PATCH',
      url: `/v1/admin/catalogs/${draft.id}`,
      token: admin.token,
      payload: { norm: 'Otra norma', expectedVersion: draft.version },
    });

    expect(stale.json<ApiErrorBody>().code).toBe('VERSION_CONFLICT');
  });

  it('rechaza umbrales de hemoglobina con rangos de edad cruzados', async () => {
    const draft = (
      await request(context, {
        method: 'POST',
        url: '/v1/admin/catalogs',
        token: admin.token,
        headers: { 'idempotency-key': randomUUID().replaceAll('-', '') },
        payload: { kind: 'HEMOGLOBIN_THRESHOLDS', norm: 'Norma ficticia de prueba' },
      })
    ).json<CatalogVersionDetail>();
    const threshold = { normalFrom: '11.0', mildFrom: '10.0', moderateFrom: '7.0' };

    const first = (
      await request(context, {
        method: 'POST',
        url: `/v1/admin/catalogs/${draft.id}/hemoglobin-thresholds`,
        token: admin.token,
        payload: { ...threshold, minAgeMonths: 6, maxAgeMonths: 23, expectedVersion: draft.version },
      })
    ).json<CatalogVersionDetail>();
    const overlapping = await request(context, {
      method: 'POST',
      url: `/v1/admin/catalogs/${draft.id}/hemoglobin-thresholds`,
      token: admin.token,
      payload: { ...threshold, minAgeMonths: 12, maxAgeMonths: 59, expectedVersion: first.version },
    });

    expect(first.thresholds).toHaveLength(1);
    expect(overlapping.json<ApiErrorBody>().code).toBe('CATALOG_RANGE_OVERLAP');
  });
});
