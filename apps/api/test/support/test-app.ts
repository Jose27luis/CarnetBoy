import { randomInt, randomUUID } from 'node:crypto';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { LoginStep, Role } from '@carnet/contracts';
import { hash } from '@node-rs/argon2';
import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import { generateSecret, generateSync } from 'otplib';
import { AppModule } from '../../src/app.module';
import { ENV } from '../../src/config/env.module';
import type { Env } from '../../src/config/env';
import { configureApp } from '../../src/configure-app';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { ARGON2_OPTIONS } from '../../src/modules/identity/credentials/argon2-options';
import { TotpSecretCipher } from '../../src/modules/identity/totp/totp-secret-cipher';

export const TEST_PASSWORD = 'clave-de-prueba-segura';

export interface TestContext {
  app: NestFastifyApplication;
  prisma: PrismaService;
  env: Env;
}

export interface TestAccount {
  id: string;
  identifier: string;
  role: Role;
  totpSecret: string;
}

export interface SignedInAccount extends TestAccount {
  token: string;
  refreshToken: string;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ trustProxy: true }));
  const env = app.get<Env>(ENV);

  configureApp(app, env);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, prisma: app.get(PrismaService), env };
}

export function randomClientIp(): string {
  return `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

export function request(context: TestContext, options: InjectOptions & { token?: string }): Promise<LightMyRequestResponse> {
  const { token, headers, ...rest } = options;

  return context.app.inject({
    remoteAddress: randomClientIp(),
    ...rest,
    headers: { ...headers, ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) },
  });
}

export function totpCode(secret: string, at: Date = new Date()): string {
  return generateSync({ secret, epoch: Math.floor(at.getTime() / 1000) });
}

export async function createAccount(
  context: TestContext,
  role: Role,
  options: { passwordChangeRequired?: boolean; totpEnrolled?: boolean } = {},
): Promise<TestAccount> {
  const totpSecret = generateSecret();
  const enrolled = options.totpEnrolled ?? role !== 'GUARDIAN';
  const identifier = role === 'GUARDIAN' ? randomDni() : `${role.toLowerCase()}-${randomUUID().slice(0, 8)}@prueba.pe`;
  const account = await context.prisma.account.create({
    data: {
      ...(role === 'GUARDIAN' ? { dni: identifier } : { email: identifier }),
      fullName: `Persona de prueba ${randomUUID().slice(0, 4)}`,
      role,
      passwordHash: await hash(TEST_PASSWORD, ARGON2_OPTIONS),
      passwordChangeRequired: options.passwordChangeRequired ?? false,
      ...(enrolled
        ? { totpSecretEncrypted: new TotpSecretCipher(context.env.TOTP_ENCRYPTION_KEY).encrypt(totpSecret), totpEnabledAt: new Date() }
        : {}),
    },
  });

  return { id: account.id, identifier, role, totpSecret };
}

let dniSequence = randomInt(10_000_000, 90_000_000);

export function randomDni(): string {
  dniSequence += randomInt(1, 500);

  return String(dniSequence);
}

export async function login(context: TestContext, identifier: string, password: string = TEST_PASSWORD): Promise<LightMyRequestResponse> {
  return request(context, { method: 'POST', url: '/v1/auth/login', payload: { identifier, password } });
}

export async function signIn(context: TestContext, account: TestAccount): Promise<SignedInAccount> {
  const first = await login(context, account.identifier);
  let step = first.json<LoginStep>();

  if (step.step === 'TOTP_REQUIRED') {
    const verified = await request(context, {
      method: 'POST',
      url: '/v1/auth/totp/verify',
      payload: { challengeToken: step.challengeToken, code: totpCode(account.totpSecret) },
    });
    step = verified.json<LoginStep>();
  }

  if (step.step !== 'AUTHENTICATED') {
    throw new Error(`No se pudo iniciar sesión con la cuenta de prueba: ${JSON.stringify(step)}`);
  }

  return { ...account, token: step.tokens.accessToken, refreshToken: step.tokens.refreshToken };
}

export async function signInAs(context: TestContext, role: Role): Promise<SignedInAccount> {
  return signIn(context, await createAccount(context, role));
}

export interface FieldDigitizer extends SignedInAccount {
  facilityId: string;
  headers: Record<string, string>;
}

let ipressSequence = randomInt(10_000_000, 90_000_000);

export async function createFacility(context: TestContext, altitudeMeters = 150): Promise<string> {
  ipressSequence += randomInt(1, 500);
  const facility = await context.prisma.facility.create({
    data: { ipressCode: String(ipressSequence), name: `Establecimiento ${ipressSequence}`, healthNetwork: 'Red de prueba', altitudeMeters },
  });

  return facility.id;
}

export async function signInDigitizerAt(context: TestContext, facilityId?: string): Promise<FieldDigitizer> {
  const grantor = await createAccount(context, 'ADMIN');
  const digitizer = await signInAs(context, 'DIGITIZER');
  const assignedFacility = facilityId ?? (await createFacility(context));

  await context.prisma.facilityAssignment.create({
    data: { accountId: digitizer.id, facilityId: assignedFacility, grantedById: grantor.id },
  });

  return { ...digitizer, facilityId: assignedFacility, headers: { 'x-facility-id': assignedFacility } };
}

export function idempotencyKey(): string {
  return randomUUID().replaceAll('-', '');
}
