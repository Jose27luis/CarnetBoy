import { NextResponse, type NextRequest } from 'next/server';
import { requestEmpty } from '@/lib/api-client';
import { clientIpFrom } from '@/lib/client-ip';
import { isSecureWeb, webEnv } from '@/lib/env';
import { REFRESH_COOKIE, clearedChallengeCookie, clearedSessionCookies } from '@/lib/session-cookies';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken !== undefined) {
    await requestEmpty('/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      clientIp: clientIpFrom(request.headers),
    });
  }

  const response = NextResponse.redirect(new URL('/ingresar', webEnv().WEB_URL), 303);

  for (const cookie of [...clearedSessionCookies(isSecureWeb()), clearedChallengeCookie(isSecureWeb())]) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
