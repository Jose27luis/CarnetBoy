import { z } from 'zod';

const TOTP_KEY_BYTES = 32;

const envSchema = z.object({
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
