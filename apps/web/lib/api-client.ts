import 'server-only';
import { type ApiErrorBody, ERROR_CODES } from '@carnet/contracts';
import { z } from 'zod';
import { webEnv } from './env';

export type ApiFailure = { ok: false; status: number; error: ApiErrorBody };
export type ApiResult<T> = { ok: true; status: number; data: T } | ApiFailure;

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  clientIp?: string | null;
  idempotencyKey?: string;
}

const errorSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

const UNREACHABLE: ApiFailure = {
  ok: false,
  status: 503,
  error: { code: 'SERVICE_UNAVAILABLE', message: 'El servicio no responde. Inténtalo de nuevo en unos minutos.' },
};

async function send(path: string, request: ApiRequest): Promise<Response | null> {
  const headers: Record<string, string> = { accept: 'application/json' };

  if (request.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (request.token) {
    headers.authorization = `Bearer ${request.token}`;
  }

  if (request.clientIp) {
    headers['x-forwarded-for'] = request.clientIp;
  }

  if (request.idempotencyKey) {
    headers['idempotency-key'] = request.idempotencyKey;
  }

  try {
    return await fetch(new URL(path, webEnv().API_INTERNAL_URL), {
      method: request.method ?? 'GET',
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
}

async function toFailure(response: Response): Promise<ApiFailure> {
  const parsed = errorSchema.safeParse(await response.json().catch(() => null));

  if (!parsed.success) {
    return { ok: false, status: response.status, error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' } };
  }

  const error: ApiErrorBody = { code: parsed.data.code, message: parsed.data.message };

  if (parsed.data.fields !== undefined) {
    error.fields = parsed.data.fields;
  }

  return { ok: false, status: response.status, error };
}

export async function requestJson<T>(path: string, request: ApiRequest = {}): Promise<ApiResult<T>> {
  const response = await send(path, request);

  if (response === null) {
    return UNREACHABLE;
  }

  if (!response.ok) {
    return toFailure(response);
  }

  return { ok: true, status: response.status, data: (await response.json()) as T };
}

export async function requestEmpty(path: string, request: ApiRequest = {}): Promise<ApiResult<null>> {
  const response = await send(path, request);

  if (response === null) {
    return UNREACHABLE;
  }

  if (!response.ok) {
    return toFailure(response);
  }

  return { ok: true, status: response.status, data: null };
}
