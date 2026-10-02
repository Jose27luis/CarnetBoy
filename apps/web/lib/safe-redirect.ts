const PROBE_ORIGIN = 'https://carnet.invalid';
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f\\]/;

export function safeReturnPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate || !candidate.startsWith('/') || UNSAFE_CHARACTERS.test(candidate)) {
    return fallback;
  }

  let resolved: URL;

  try {
    resolved = new URL(candidate, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  return resolved.origin === PROBE_ORIGIN ? `${resolved.pathname}${resolved.search}${resolved.hash}` : fallback;
}
