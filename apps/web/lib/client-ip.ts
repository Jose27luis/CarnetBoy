export function clientIpFrom(headers: Headers): string | null {
  const cloudflare = headers.get('cf-connecting-ip');

  if (cloudflare !== null && cloudflare.length > 0) {
    return cloudflare;
  }

  const realIp = headers.get('x-real-ip');

  if (realIp !== null && realIp.length > 0) {
    return realIp;
  }

  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded !== undefined && forwarded.length > 0 ? forwarded : null;
}
