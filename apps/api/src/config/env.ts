import { z } from 'zod';

const TOTP_KEY_BYTES = 32;
const BOOTSTRAP_PASSWORD_MIN_LENGTH = 8;

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_SIZE: z.coerce.number().int().min(2).max(50).default(10),
    REDIS_URL: z.string().min(1),
    WEB_URL: z.url(),
    JWT_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres'),
    TOTP_ENCRYPTION_KEY: z
      .string()
      .refine((value) => Buffer.from(value, 'base64').length === TOTP_KEY_BYTES, {
        message: `Debe ser una clave de ${TOTP_KEY_BYTES} bytes codificada en base64`,
      }),
    TOTP_ISSUER: z.string().min(1).max(40).default('Carnet CRED'),
    TOTP_REQUIRED: z
      .enum(['true', 'false'], { message: 'Usa true o false' })
      .default('true')
      .transform((value) => value === 'true'),
    STAFF_PASSWORD_CHANGE: z
      .enum(['true', 'false'], { message: 'Usa true o false' })
      .default('true')
      .transform((value) => value === 'true'),
    BOOTSTRAP_ADMIN_EMAIL: optionalText.pipe(z.email().optional()),
    BOOTSTRAP_ADMIN_PASSWORD: optionalText.pipe(
      z.string().min(BOOTSTRAP_PASSWORD_MIN_LENGTH, `Debe tener al menos ${BOOTSTRAP_PASSWORD_MIN_LENGTH} caracteres`).optional(),
    ),
    BOOTSTRAP_ADMIN_NAME: optionalText.pipe(z.string().min(3).max(160).optional()),
    RESEND_API_KEY: optionalText.pipe(z.string().startsWith('re_', 'Debe empezar con re_').optional()),
    MAIL_FROM: optionalText.pipe(z.string().min(3).max(200).optional()),
    VAPID_PUBLIC_KEY: optionalText,
    VAPID_PRIVATE_KEY: optionalText,
  })
  .refine((env) => (env.BOOTSTRAP_ADMIN_EMAIL === undefined) === (env.BOOTSTRAP_ADMIN_PASSWORD === undefined), {
    message: 'BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD van juntos',
    path: ['BOOTSTRAP_ADMIN_PASSWORD'],
  })
  .refine((env) => (env.RESEND_API_KEY === undefined) === (env.MAIL_FROM === undefined), {
    message: 'RESEND_API_KEY y MAIL_FROM van juntos',
    path: ['MAIL_FROM'],
  })
  .refine((env) => (env.VAPID_PUBLIC_KEY === undefined) === (env.VAPID_PRIVATE_KEY === undefined), {
    message: 'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY van juntos',
    path: ['VAPID_PRIVATE_KEY'],
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');

    throw new Error(`Variables de entorno inválidas -> ${detail}`);
  }

  return result.data;
}
