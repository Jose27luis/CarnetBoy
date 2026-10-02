import 'server-only';
import type { CurrentAccount, Role } from '@carnet/contracts';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { type ApiRequest, type ApiResult, requestEmpty, requestJson } from './api-client';
import { clientIpFrom } from './client-ip';
import { ACCESS_COOKIE } from './session-cookies';

type SessionRequest = Omit<ApiRequest, 'token' | 'clientIp'>;

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  DIGITIZER: '/pronto',
  GUARDIAN: '/pronto',
};

export async function accessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function currentClientIp(): Promise<string | null> {
  return clientIpFrom(await headers());
}

async function withSession(request: SessionRequest): Promise<ApiRequest> {
  return { ...request, token: await accessToken(), clientIp: await currentClientIp() };
}

export async function api<T>(path: string, request: SessionRequest = {}): Promise<ApiResult<T>> {
  return requestJson<T>(path, await withSession(request));
}

export async function apiEmpty(path: string, request: SessionRequest = {}): Promise<ApiResult<null>> {
  return requestEmpty(path, await withSession(request));
}

export const currentAccount = cache(async (): Promise<CurrentAccount | null> => {
  if ((await accessToken()) === null) {
    return null;
  }

  const result = await api<CurrentAccount>('/v1/auth/me');

  return result.ok ? result.data : null;
});

export async function requireRole(role: Role, returnTo: string): Promise<CurrentAccount> {
  const account = await currentAccount();

  if (account === null) {
    redirect(`/ingresar?next=${encodeURIComponent(returnTo)}`);
  }

  if (account.role !== role) {
    redirect(HOME_BY_ROLE[account.role]);
  }

  return account;
}

export async function loadOrFail<T>(path: string): Promise<T> {
  const result = await api<T>(path);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  return result.data;
}
