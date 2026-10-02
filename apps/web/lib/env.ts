import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  API_INTERNAL_URL: z.url(),
  WEB_URL: z.url(),
});

export type WebEnv = z.infer<typeof envSchema>;

let cached: WebEnv | undefined;

export function webEnv(): WebEnv {
  if (cached === undefined) {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const detail = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new Error(`Variables de entorno inválidas -> ${detail}`);
    }

    cached = result.data;
  }

  return cached;
}

export function isSecureWeb(): boolean {
  return new URL(webEnv().WEB_URL).protocol === 'https:';
}
