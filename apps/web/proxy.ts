import type { AuthTokens } from '@carnet/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { requestJson } from './lib/api-client';
import { clientIpFrom } from './lib/client-ip';
import { isSecureWeb } from './lib/env';
import { contentSecurityPolicy, createNonce } from './lib/security-headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearedSessionCookies, sessionCookies, type CookieToSet } from './lib/session-cookies';

function forward(request: NextRequest, cookies: CookieToSet[] = []): NextResponse {
  for (const cookie of cookies) {
    if (cookie.options.maxAge > 0) {
      request.cookies.set(cookie.name, cookie.value);
    } else {
      request.cookies.delete(cookie.name);
    }
  }

  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', policy);

  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (request.cookies.has(ACCESS_COOKIE) || refreshToken === undefined) {
    return forward(request);
  }

  const refreshed = await requestJson<AuthTokens>('/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    clientIp: clientIpFrom(request.headers),
  });

  if (refreshed.ok) {
    return forward(request, sessionCookies(refreshed.data, isSecureWeb()));
  }

  if (refreshed.status === 401) {
    return forward(request, clearedSessionCookies(isSecureWeb()));
  }

  return forward(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|salir).*)'],
};
