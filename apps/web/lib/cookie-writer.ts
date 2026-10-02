import 'server-only';
import { cookies } from 'next/headers';
import type { CookieToSet } from './session-cookies';

export async function writeCookies(list: readonly CookieToSet[]): Promise<void> {
  const store = await cookies();

  for (const cookie of list) {
    store.set(cookie.name, cookie.value, cookie.options);
  }
}
