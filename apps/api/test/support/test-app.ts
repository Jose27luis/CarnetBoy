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
  email: string;
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
  const email = `${role.toLowerCase()}-${randomUUID().slice(0, 8)}@prueba.pe`;
  const account = await context.prisma.account.create({
    data: {
      email,
      fullName: `Persona de prueba ${randomUUID().slice(0, 4)}`,
      role,
      passwordHash: await hash(TEST_PASSWORD, ARGON2_OPTIONS),
      passwordChangeRequired: options.passwordChangeRequired ?? false,
      ...(enrolled
        ? { totpSecretEncrypted: new TotpSecretCipher(context.env.TOTP_ENCRYPTION_KEY).encrypt(totpSecret), totpEnabledAt: new Date() }
        : {}),
    },
  });

  return { id: account.id, email, role, totpSecret };
}

export async function login(context: TestContext, email: string, password: string = TEST_PASSWORD): Promise<LightMyRequestResponse> {
  return request(context, { method: 'POST', url: '/v1/auth/login', payload: { email, password } });
}

export async function signIn(context: TestContext, account: TestAccount): Promise<SignedInAccount> {
  const first = await login(context, account.email);
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
